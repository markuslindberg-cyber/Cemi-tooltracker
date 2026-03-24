import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Camera, CheckCircle2, Loader2, Search, Package, MapPin,
  AlertTriangle, ArrowLeft, Download, ClipboardList, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Excel/CSV export ──────────────────────────────────────────────────────────
function exportToExcel(sessionConfig, checkedItems, allItems) {
  const date = new Date().toLocaleDateString('sv-SE');
  const locationLabel = sessionConfig.location ? sessionConfig.location.name : 'Öppen inventering';
  const typeLabel = sessionConfig.toolType === 'tools' ? 'Maskiner'
    : sessionConfig.toolType === 'handtools' ? 'Handredskap' : 'Maskiner & Handredskap';

  const header = ['Namn', 'Typ', 'Kategori', 'Streckkod', 'Plats', 'Status', 'Skick', 'Inventeringsdatum', 'Resultat'];

  const toRow = (item, result) => [
    item.name,
    item._type === 'handtool' ? 'Handredskap' : 'Maskin',
    item.category || '',
    item.barcode || '',
    item.location_name || '',
    item.status || '',
    item.condition || '',
    date,
    result,
  ];

  const checkedRows = allItems.filter(i => checkedItems.has(i.id)).map(i => toRow(i, 'Kontrollerad'));
  const uncheckedRows = allItems.filter(i => !checkedItems.has(i.id)).map(i => toRow(i, 'EJ KONTROLLERAD'));

  const sep = () => Array(header.length).fill('');

  const csvContent = [
    [`Inventeringsrapport - ${locationLabel} - ${typeLabel} - ${date}`],
    [`Kontrollerade: ${checkedItems.size} / ${allItems.length}  |  Ej kontrollerade: ${allItems.length - checkedItems.size}`],
    [],
    header,
    ...(checkedRows.length > 0 ? [['=== KONTROLLERADE ===', ...Array(header.length - 1).fill('')], ...checkedRows] : []),
    ...(uncheckedRows.length > 0 ? [sep(), ['=== EJ KONTROLLERADE ===', ...Array(header.length - 1).fill('')], ...uncheckedRows] : []),
  ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `inventering_${locationLabel.replace(/\s/g, '_')}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Setup Step ────────────────────────────────────────────────────────────────
function SetupStep({ onStart }) {
  const [mode, setMode] = useState(''); // 'location' | 'open'
  const [locationId, setLocationId] = useState('');
  const [toolType, setToolType] = useState('both'); // 'tools' | 'handtools' | 'both'

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
  });

  const canStart = mode === 'open' || (mode === 'location' && locationId);
  const selectedLocation = locations.find(l => l.id === locationId);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventeringskontroll</h1>
          <p className="text-gray-500 mt-1">Välj hur du vill genomföra inventeringen</p>
        </div>

        {/* Mode selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('location')}
            className={cn(
              "p-6 rounded-2xl border-2 text-left transition-all",
              mode === 'location'
                ? "border-[#8B1E1E] bg-[#8B1E1E]/5"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <MapPin className={cn("w-8 h-8 mb-3", mode === 'location' ? "text-[#8B1E1E]" : "text-gray-400")} />
            <h3 className="font-semibold text-gray-900">Platsbaserad inventering</h3>
            <p className="text-sm text-gray-500 mt-1">Inventera maskiner och/eller handredskap på en specifik plats</p>
          </button>

          <button
            onClick={() => setMode('open')}
            className={cn(
              "p-6 rounded-2xl border-2 text-left transition-all",
              mode === 'open'
                ? "border-[#8B1E1E] bg-[#8B1E1E]/5"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <Globe className={cn("w-8 h-8 mb-3", mode === 'open' ? "text-[#8B1E1E]" : "text-gray-400")} />
            <h3 className="font-semibold text-gray-900">Öppen inventering</h3>
            <p className="text-sm text-gray-500 mt-1">Skanna vad som helst, oberoende av plats</p>
          </button>
        </div>

        {mode === 'location' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="space-y-2">
              <Label>Välj plats *</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj en plats" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter(l => l.is_active !== false).map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vad ska inventeras?</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'tools', label: 'Maskiner' },
                  { value: 'handtools', label: 'Handredskap' },
                  { value: 'arbetskläder', label: 'Arbetskläder' },
                  { value: 'all', label: 'Alla' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setToolType(opt.value)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-sm font-medium transition-all",
                      toolType === opt.value
                        ? "border-[#8B1E1E] bg-[#8B1E1E] text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'open' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="space-y-2">
              <Label>Vad ska inventeras?</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'tools', label: 'Maskiner' },
                  { value: 'handtools', label: 'Handredskap' },
                  { value: 'arbetskläder', label: 'Arbetskläder' },
                  { value: 'all', label: 'Alla' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setToolType(opt.value)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-sm font-medium transition-all",
                      toolType === opt.value
                        ? "border-[#8B1E1E] bg-[#8B1E1E] text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode && (
          <Button
            onClick={() => onStart({ mode, location: selectedLocation || null, locationId, toolType })}
            disabled={!canStart}
            className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-12 text-base"
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            Starta inventering
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Active Inventory ──────────────────────────────────────────────────────────
function ActiveInventory({ sessionConfig, onEnd }) {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [tempStatus, setTempStatus] = useState('');
  const [tempCondition, setTempCondition] = useState('');

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
  });

  const { data: handTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 500),
  });

  const { data: arbetskläder = [] } = useQuery({
    queryKey: ['arbetskläder'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500),
  });

  const updateToolMutation = useMutation({
    mutationFn: ({ id, data, type }) => {
      if (type === 'handtool') return base44.entities.HandTool.update(id, data);
      if (type === 'arbetskläder') return base44.entities.ArbetskläderUtrustning.update(id, data);
      return base44.entities.Tool.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tools']);
      queryClient.invalidateQueries(['handtools']);
      queryClient.invalidateQueries(['arbetskläder']);
    },
  });

  // Build scoped item list
  const scopedItems = React.useMemo(() => {
    const { mode, locationId, toolType } = sessionConfig;
    let toolList = [];
    let handToolList = [];
    let arbetskläderList = [];

    if (toolType !== 'handtools') {
      toolList = tools.map(t => ({ ...t, _type: 'tool' }));
      if (mode === 'location') toolList = toolList.filter(t => t.location_id === locationId);
    }
    if (toolType !== 'tools') {
      handToolList = handTools.map(t => ({ ...t, _type: 'handtool' }));
      if (mode === 'location') handToolList = handToolList.filter(t => t.location_id === locationId);
    }
    if (toolType !== 'tools') {
      arbetskläderList = arbetskläder.map(a => ({ ...a, _type: 'arbetskläder' }));
      if (mode === 'location') arbetskläderList = arbetskläderList.filter(a => a.location_id === locationId);
    }

    return [...toolList, ...handToolList, ...arbetskläderList];
  }, [tools, handTools, arbetskläder, sessionConfig]);

  useEffect(() => {
    if (!scannerActive) return;
    const scanner = new Html5QrcodeScanner("barcode-scanner", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(
      (text) => { handleScan(text); scanner.clear(); setScannerActive(false); },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [scannerActive, scopedItems]);

  const handleScan = (barcode) => {
    const item = scopedItems.find(t => t.barcode === barcode)
      || (sessionConfig.mode === 'open'
        ? [...tools.map(t => ({ ...t, _type: 'tool' })), ...handTools.map(t => ({ ...t, _type: 'handtool' }))].find(t => t.barcode === barcode)
        : null);
    if (item) {
      setScannedItem(item);
      setTempStatus(item.status);
      setTempCondition(item.condition);
      setCheckedItems(prev => new Set([...prev, item.id]));
    } else {
      alert(`Inget föremål hittades med streckkod: ${barcode}`);
    }
  };

  const handleConfirm = async () => {
    if (!scannedItem) return;
    const updates = {};
    if (tempStatus !== scannedItem.status) updates.status = tempStatus;
    if (tempCondition !== scannedItem.condition) updates.condition = tempCondition;
    updates.last_seen_date = new Date().toISOString();
    await updateToolMutation.mutateAsync({ id: scannedItem.id, data: updates, type: scannedItem._type });
    setScannedItem(null);
  };

  const checkedCount = checkedItems.size;
  const totalCount = scopedItems.length;
  const uncheckedItems = scopedItems.filter(t => !checkedItems.has(t.id));
  const isDone = sessionConfig.mode !== 'open' && checkedCount === totalCount && totalCount > 0;

  const locationLabel = sessionConfig.location ? sessionConfig.location.name : 'Öppen';
  const typeLabel = sessionConfig.toolType === 'tools' ? 'Maskiner'
    : sessionConfig.toolType === 'handtools' ? 'Handredskap' : 'Maskiner & Handredskap';

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => onEnd(sessionConfig, checkedItems, scopedItems)} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Inventering pågår</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{locationLabel}</Badge>
              <Badge variant="outline">{typeLabel}</Badge>
            </div>
          </div>
          <Button
            onClick={() => onEnd(sessionConfig, checkedItems, scopedItems)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            <Download className="w-4 h-4 mr-2" />
            Avsluta & exportera
          </Button>
        </div>

        {/* Progress */}
        {sessionConfig.mode !== 'open' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Framsteg</span>
              <span className="text-sm font-bold text-[#8B1E1E]">{checkedCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-[#8B1E1E] h-3 rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }} />
            </div>
            {isDone && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Alla föremål kontrollerade!</span>
              </div>
            )}
          </div>
        )}

        {sessionConfig.mode === 'open' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#8B1E1E]" />
            <span className="font-medium text-gray-800">{checkedCount} föremål kontrollerade</span>
          </div>
        )}

        {/* Scanner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Skanna streckkod</h2>
          {!scannerActive ? (
            <div className="space-y-4">
              <Button onClick={() => setScannerActive(true)} className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-14" size="lg">
                <Camera className="w-5 h-5 mr-2" />Starta kameraskanner
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500">ELLER</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Ange streckkod manuellt" value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (handleScan(manualBarcode), setManualBarcode(''))} />
                <Button onClick={() => { handleScan(manualBarcode); setManualBarcode(''); }} disabled={!manualBarcode}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="barcode-scanner" className="rounded-xl overflow-hidden" />
              <Button onClick={() => setScannerActive(false)} variant="outline" className="w-full">Avbryt skanning</Button>
            </div>
          )}
        </div>

        {/* Scanned item */}
        {scannedItem && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                {scannedItem.image_url
                  ? <img src={scannedItem.image_url} alt={scannedItem.name} className="w-full h-full object-cover rounded-xl" />
                  : <Package className="w-8 h-8 text-gray-400" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-900">{scannedItem.name}</h3>
                  <Badge variant="outline" className="text-xs">{scannedItem._type === 'handtool' ? 'Handredskap' : scannedItem._type === 'arbetskläder' ? 'Arbetskläder' : 'Maskin'}</Badge>
                </div>
                {scannedItem.location_name && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />{scannedItem.location_name}
                  </div>
                )}
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(scannedItem._type === 'handtool' || scannedItem._type === 'arbetskläder') ? (
                            <>
                              <SelectItem value="i_lager">I lager</SelectItem>
                              <SelectItem value="i_bruk">I bruk</SelectItem>
                              <SelectItem value="saknas">Saknas</SelectItem>
                              <SelectItem value="kasserad">Kasserad</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="available">Tillgänglig</SelectItem>
                              <SelectItem value="in_use">I bruk</SelectItem>
                              <SelectItem value="maintenance">Underhåll</SelectItem>
                              <SelectItem value="missing">Saknas</SelectItem>
                              <SelectItem value="retired">Kasserad</SelectItem>
                            </>
                          )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Skick</Label>
                <Select value={tempCondition} onValueChange={setTempCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(scannedItem._type === 'handtool' || scannedItem._type === 'arbetskläder') ? (
                        <>
                          <SelectItem value="ny">Ny</SelectItem>
                          <SelectItem value="bra">Bra</SelectItem>
                          <SelectItem value="okej">Okej</SelectItem>
                          <SelectItem value="dålig">Dålig</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="new">Ny</SelectItem>
                          <SelectItem value="good">Bra</SelectItem>
                          <SelectItem value="fair">Okej</SelectItem>
                          <SelectItem value="poor">Dålig</SelectItem>
                        </>
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setScannedItem(null)} variant="outline" className="flex-1">Avbryt</Button>
              <Button onClick={handleConfirm} className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]" disabled={updateToolMutation.isPending}>
                {updateToolMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Bekräfta</>}
              </Button>
            </div>
          </div>
        )}

        {/* Unchecked */}
        {sessionConfig.mode !== 'open' && uncheckedItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Ej kontrollerade ({uncheckedItems.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uncheckedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        : <Package className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.barcode && <p className="text-xs text-gray-500">Streckkod: {item.barcode}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item._type === 'handtool' ? 'Handredskap' : item._type === 'arbetskläder' ? 'Arbetskläder' : 'Maskin'}</Badge>
                    {item.location_name && <Badge variant="outline" className="text-xs">{item.location_name}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Step ──────────────────────────────────────────────────────────────
function SummaryStep({ sessionConfig, checkedItems, allItems, onNew }) {
  const locationLabel = sessionConfig.location ? sessionConfig.location.name : 'Öppen inventering';
  const typeLabel = sessionConfig.toolType === 'tools' ? 'Maskiner'
    : sessionConfig.toolType === 'handtools' ? 'Handredskap' : 'Maskiner & Handredskap';
  const date = new Date().toLocaleDateString('sv-SE');

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventering klar!</h1>
            <p className="text-gray-500 text-sm">{date}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{locationLabel}</Badge>
            <Badge variant="outline">{typeLabel}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{allItems.length}</p>
              <p className="text-sm text-gray-500">Totalt</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-700">{checkedItems.size}</p>
              <p className="text-sm text-gray-500">Kontrollerade</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-700">{allItems.length - checkedItems.size}</p>
              <p className="text-sm text-gray-500">Ej kontrollerade</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => exportToExcel(sessionConfig, checkedItems, allItems)}
            className="flex-1 bg-green-700 hover:bg-green-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportera till Excel (CSV)
          </Button>
          <Button onClick={onNew} variant="outline" className="flex-1">
            Ny inventering
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function InventoryCheck() {
  const [phase, setPhase] = useState('setup');
  const [sessionConfig, setSessionConfig] = useState(null);
  const [finalChecked, setFinalChecked] = useState(new Set());
  const [finalItems, setFinalItems] = useState([]);

  const handleStart = (config) => {
    setSessionConfig(config);
    setPhase('active');
  };

  const handleEnd = async (config, checkedItems, allItems) => {
    setFinalChecked(checkedItems);
    setFinalItems(allItems);
    setPhase('summary');

    // Save report
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const checkedArr = allItems.filter(i => checkedItems.has(i.id)).map(i => ({
      id: i.id, name: i.name, type: i._type, category: i.category || '',
      barcode: i.barcode || '', location_name: i.location_name || '',
      status: i.status || '', condition: i.condition || '',
    }));
    const uncheckedArr = allItems.filter(i => !checkedItems.has(i.id)).map(i => ({
      id: i.id, name: i.name, type: i._type, category: i.category || '',
      barcode: i.barcode || '', location_name: i.location_name || '',
      status: i.status || '',
    }));

    await base44.entities.InventoryReport.create({
      location_name: config.location?.name || null,
      location_id: config.locationId || null,
      tool_type: config.toolType,
      mode: config.mode,
      performed_by_name: user?.full_name || null,
      performed_by_email: user?.email || null,
      performed_at: new Date().toISOString(),
      total_items: allItems.length,
      checked_items: checkedItems.size,
      unchecked_items: allItems.length - checkedItems.size,
      checked_list: checkedArr,
      unchecked_list: uncheckedArr,
    });
  };

  const handleNew = () => {
    setSessionConfig(null);
    setFinalChecked(new Set());
    setFinalItems([]);
    setPhase('setup');
  };

  if (phase === 'setup') return <SetupStep onStart={handleStart} />;
  if (phase === 'active') return <ActiveInventory sessionConfig={sessionConfig} onEnd={handleEnd} />;
  if (phase === 'summary') return <SummaryStep sessionConfig={sessionConfig} checkedItems={finalChecked} allItems={finalItems} onNew={handleNew} />;
  return null;
}