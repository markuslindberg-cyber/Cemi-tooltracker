import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CheckCircle2, Search, Package, MapPin, Loader2, AlertTriangle, BarChart2 } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ToolScanModal({ isOpen, onClose, tools }) {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [foundTool, setFoundTool] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempCondition, setTempCondition] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setScannerActive(false);
      setFoundTool(null);
      setManualBarcode('');
      setNotFound(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!scannerActive) return;
    const scanner = new Html5QrcodeScanner(
      "tool-barcode-scanner",
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
      false
    );
    scanner.render(
      (decodedText) => {
        handleScan(decodedText);
        scanner.clear();
        setScannerActive(false);
      },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [scannerActive, tools]);

  const handleScan = (barcode) => {
    const tool = tools.find(t => t.barcode === barcode);
    if (tool) {
      setFoundTool(tool);
      setTempStatus(tool.status || 'available');
      setTempCondition(tool.condition || 'good');
      setNotFound(false);
    } else {
      setFoundTool(null);
      setNotFound(true);
    }
  };

  const handleManualSearch = () => {
    if (!manualBarcode.trim()) return;
    handleScan(manualBarcode.trim());
    setManualBarcode('');
  };

  const handleConfirm = async () => {
    if (!foundTool) return;
    setSaving(true);
    await base44.entities.Tool.update(foundTool.id, {
      status: tempStatus,
      condition: tempCondition,
      last_seen_date: new Date().toISOString(),
    });
    setCheckedIds(prev => new Set([...prev, foundTool.id]));
    queryClient.invalidateQueries(['tools']);
    setSaving(false);
    setFoundTool(null);
  };

  const unchecked = tools.filter(t => t.barcode && !checkedIds.has(t.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#8B1E1E]" />
            Inventera maskiner
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">Kontrollerade</span>
          <span className="font-bold text-[#8B1E1E]">{checkedIds.size} / {tools.filter(t => t.barcode).length}</span>
        </div>

        {/* Scanner */}
        <div className="space-y-3">
          {!scannerActive ? (
            <>
              <Button
                onClick={() => setScannerActive(true)}
                className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-12"
              >
                <Camera className="w-5 h-5 mr-2" />
                Starta kameraskanner
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">ELLER</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Ange streckkod manuellt"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                />
                <Button onClick={handleManualSearch} disabled={!manualBarcode.trim()}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div id="tool-barcode-scanner" className="rounded-xl overflow-hidden" />
              <Button onClick={() => setScannerActive(false)} variant="outline" className="w-full">
                Avbryt skanning
              </Button>
            </div>
          )}
        </div>

        {/* Not found */}
        {notFound && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Ingen maskin hittades med den streckkoden.
          </div>
        )}

        {/* Found tool */}
        {foundTool && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {foundTool.image_url
                  ? <img src={foundTool.image_url} alt={foundTool.name} className="w-full h-full object-cover rounded-lg" />
                  : <Package className="w-6 h-6 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{foundTool.name}</p>
                <p className="text-sm text-gray-500">{foundTool.category}{foundTool.manufacturer ? ` · ${foundTool.manufacturer}` : ''}</p>
                {foundTool.location_name && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{foundTool.location_name}
                  </p>
                )}
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Tillgänglig</SelectItem>
                    <SelectItem value="in_use">I bruk</SelectItem>
                    <SelectItem value="maintenance">Underhåll</SelectItem>
                    <SelectItem value="missing">Saknas</SelectItem>
                    <SelectItem value="retired">Kasserad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Skick</Label>
                <Select value={tempCondition} onValueChange={setTempCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Ny</SelectItem>
                    <SelectItem value="good">Bra</SelectItem>
                    <SelectItem value="fair">Okej</SelectItem>
                    <SelectItem value="poor">Dålig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFoundTool(null)}>Avbryt</Button>
              <Button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Bekräfta</>}
              </Button>
            </div>
          </div>
        )}

        {/* Unchecked with barcodes */}
        {unchecked.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Ej kontrollerade ({unchecked.length})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {unchecked.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-900">{t.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{t.barcode}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}