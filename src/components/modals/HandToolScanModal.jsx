import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, Search, Package, MapPin, Loader2, AlertTriangle, BarChart2, Plus, Minus } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';
import { useBarcodeCamera } from "@/hooks/useBarcodeCamera";

export default function HandToolScanModal({ isOpen, onClose, handTools }) {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [foundGroup, setFoundGroup] = useState(null); // { barcode, tools: [], countFound: number }
  const [saving, setSaving] = useState(false);
  const [checkedBarcodes, setCheckedBarcodes] = useState(new Set());
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setScannerActive(false);
      setFoundGroup(null);
      setManualBarcode('');
      setNotFound(false);
    }
  }, [isOpen]);

  useBarcodeCamera("ht-barcode-scanner", scannerActive, (barcode) => {
    handleScan(barcode);
    setScannerActive(false);
  });

  const handleScan = (barcode) => {
    const tools = handTools.filter(t => t.barcode === barcode);
    if (tools.length > 0) {
      if (foundGroup && foundGroup.barcode === barcode) {
        // Same barcode scanned again — increment count
        setFoundGroup(prev => ({ ...prev, countFound: prev.countFound + 1 }));
      } else {
        setFoundGroup({ barcode, tools, countFound: 1 });
      }
      setNotFound(false);
    } else {
      setFoundGroup(null);
      setNotFound(true);
    }
  };

  const handleManualSearch = () => {
    if (!manualBarcode.trim()) return;
    handleScan(manualBarcode.trim());
    setManualBarcode('');
  };

  const handleConfirm = async () => {
    if (!foundGroup) return;
    setSaving(true);
    // Update last_seen_date on all tools in the group
    await Promise.all(foundGroup.tools.map(t =>
      base44.entities.HandTool.update(t.id, {
        last_seen_date: new Date().toISOString(),
        status: 'i_lager',
      })
    ));
    setCheckedBarcodes(prev => new Set([...prev, foundGroup.barcode]));
    queryClient.invalidateQueries(['handtools']);
    setSaving(false);
    setFoundGroup(null);
  };

  // Unique barcodes across all handtools
  const allBarcodes = [...new Set(handTools.filter(t => t.barcode).map(t => t.barcode))];
  const uncheckedBarcodes = allBarcodes.filter(b => !checkedBarcodes.has(b));

  // Summarize group info for display
  const getGroupLabel = (tools) => {
    const name = tools[0]?.category || tools[0]?.name || '';
    const location = tools[0]?.location_name || '';
    return { name, location, count: tools.length };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#8B1E1E]" />
            Inventera handredskap
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">Kontrollerade grupper</span>
          <span className="font-bold text-[#8B1E1E]">{checkedBarcodes.size} / {allBarcodes.length}</span>
        </div>

        {/* Scanner */}
        <div className="space-y-3">
          {!scannerActive ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setScannerActive(true)}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515] h-10"
              >
                <Camera className="w-5 h-5 mr-2" />
                Kamera
              </Button>

              <div className="flex-1 flex gap-1">
                <Input
                  placeholder="Streckkod"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                  className="text-sm"
                />
                <Button onClick={handleManualSearch} disabled={!manualBarcode.trim()} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div id="ht-barcode-scanner" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: '300px' }} />
              <Button onClick={() => setScannerActive(false)} variant="outline" className="w-full">
                Avbryt
              </Button>
            </div>
          )}
        </div>

        {/* Not found */}
        {notFound && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Ingen grupp hittades med den streckkoden.
          </div>
        )}

        {/* Found group */}
        {foundGroup && (() => {
          const { name, location, count } = getGroupLabel(foundGroup.tools);
          return (
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{name}</p>
                  {location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{location}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Förväntat antal: <span className="font-semibold text-gray-700">{count} st</span></p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              </div>

              {/* Count input */}
              <div className="space-y-1">
                <Label>Antal hittade</Label>
                <p className="text-xs text-gray-500">Skanna streckkoden igen för att räkna upp, eller ange manuellt</p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFoundGroup(prev => ({ ...prev, countFound: Math.max(0, prev.countFound - 1) }))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    className="text-center text-xl font-bold w-24"
                    value={foundGroup.countFound}
                    onChange={e => setFoundGroup(prev => ({ ...prev, countFound: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFoundGroup(prev => ({ ...prev, countFound: prev.countFound + 1 }))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500">av {count} st</span>
                </div>
                {foundGroup.countFound < count && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    {count - foundGroup.countFound} redskap saknas
                  </p>
                )}
                {foundGroup.countFound === count && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Alla redskap bekräftade!
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setFoundGroup(null)}>Avbryt</Button>
                <Button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</>
                    : <><CheckCircle2 className="w-4 h-4 mr-2" />Bekräfta</>
                  }
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Unchecked groups */}
        {uncheckedBarcodes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Ej kontrollerade grupper ({uncheckedBarcodes.length})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {uncheckedBarcodes.map(barcode => {
                const tools = handTools.filter(t => t.barcode === barcode);
                const { name, location, count } = getGroupLabel(tools);
                return (
                  <div key={barcode} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="text-gray-900 font-medium">{name}</span>
                      {location && <span className="text-gray-400 ml-1">· {location}</span>}
                    </div>
                    <span className="text-xs text-gray-400">{count} st · <span className="font-mono">{barcode}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}