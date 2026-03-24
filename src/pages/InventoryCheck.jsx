import React, { useState, useEffect } from 'react';
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
  AlertTriangle, Download, RotateCcw, Shovel, Wrench, Globe,
} from 'lucide-react';

export default function InventoryCheck() {
  const queryClient = useQueryClient();

  // Setup state
  const [mode, setMode] = useState(null); // 'location' | 'open'
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [itemType, setItemType] = useState('both'); // 'tools' | 'handtools' | 'both'
  const [sessionStarted, setSessionStarted] = useState(false);

  // Scanning state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [scannedItemType, setScannedItemType] = useState(null); // 'tool' | 'handtool'
  const [manualBarcode, setManualBarcode] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [tempStatus, setTempStatus] = useState('');
  const [tempCondition, setTempCondition] = useState('');
  const [checkLog, setCheckLog] = useState([]); // for report

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
    enabled: sessionStarted,
  });

  const { data: handTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 1000),
    enabled: sessionStarted,
  });

  const updateToolMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tool.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['tools']),
  });

  const updateHandToolMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HandTool.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['handtools']),
  });

  // Filter items based on mode and selection
  const filteredTools = (mode === 'location' && selectedLocationId)
    ? tools.filter(t => t.location_id === selectedLocationId)
    : tools;

  const filteredHandTools = (mode === 'location' && selectedLocationId)
    ? handTools.filter(t => t.location_id === selectedLocationId)
    : handTools;

  const activeTools = (itemType === 'tools' || itemType === 'both') ? filteredTools : [];
  const activeHandTools = (itemType === 'handtools' || itemType === 'both') ? filteredHandTools : [];
  const totalItems = activeTools.length + activeHandTools.length;
  const checkedCount = checkedIds.size;

  const uncheckedTools = activeTools.filter(t => !checkedIds.has(t.id));
  const uncheckedHandTools = activeHandTools.filter(t => !checkedIds.has(t.id));

  useEffect(() => {
    if (!scannerActive) return;
    const scanner = new Html5QrcodeScanner("barcode-scanner", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(
      (decodedText) => { handleScan(decodedText); scanner.clear(); setScannerActive(false); },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [scannerActive, tools, handTools]);

  const handleScan = (barcode) => {
    if (itemType !== 'handtools') {
      const tool = activeTools.find(t => t.barcode === barcode);
      if (tool) { openItem(tool, 'tool'); return; }
    }
    if (itemType !== 'tools') {
      const ht = activeHandTools.find(t => t.barcode === barcode);
      if (ht) { openItem(ht, 'handtool'); return; }
    }
    // open mode: search all
    if (mode === 'open') {
      const tool = tools.find(t => t.barcode === barcode);
      if (tool) { openItem(tool, 'tool'); return; }
      const ht = handTools.find(t => t.barcode === barcode);
      if (ht) { openItem(ht, 'handtool'); return; }
    }
    alert(`Inget objekt hittades med streckkod: ${barcode}`);
  };

  const openItem = (item, type) => {
    setScannedItem(item);
    setScannedItemType(type);
    setTempStatus(item.status);
    setTempCondition(item.condition);
    setCheckedIds(prev => new Set([...prev, item.id]));
  };

  const handleManualSearch = () => {
    if (!manualBarcode) return;
    handleScan(manualBarcode);
    setManualBarcode('');
  };

  const handleConfirmCheck = async () => {
    if (!scannedItem) return;
    const updates = { last_seen_date: new Date().toISOString() };
    if (tempStatus !== scannedItem.status) updates.status = tempStatus;
    if (tempCondition !== scannedItem.condition) updates.condition = tempCondition;

    if (scannedItemType === 'tool') {
      await updateToolMutation.mutateAsync({ id: scannedItem.id, data: updates });
    } else {
      await updateHandToolMutation.mutateAsync({ id: scannedItem.id, data: updates });
    }

    setCheckLog(prev => [...prev, {
      name: scannedItem.name,
      type: scannedItemType === 'tool' ? 'Maskin' : 'Handredskap',
      barcode: scannedItem.barcode || '',
      location: scannedItem.location_name || '',
      status: tempStatus,
      condition: tempCondition,
      checked_at: new Date().toLocaleString('sv-SE'),
    }]);

    setScannedItem(null);
  };

  const handleExportExcel = () => {
    const selectedLoc = locations.find(l => l.id === selectedLocationId);

    // Build rows: checked + unchecked
    const checkedRows = checkLog.map(r => ({
      Namn: r.name,
      Typ: r.type,
      Streckkod: r.barcode,
      Plats: r.location,
      Status: r.status,
      Skick: r.condition,
      Inventerad: r.checked_at,
      Resultat: 'Kontrollerad',
    }));

    const uncheckedToolRows = uncheckedTools.map(t => ({
      Namn: t.name,
      Typ: 'Maskin',
      Streckkod: t.barcode || '',
      Plats: t.location_name || '',
      Status: t.status,
      Skick: t.condition,
      Inventerad: '',
      Resultat: 'EJ KONTROLLERAD',
    }));

    const uncheckedHandToolRows = uncheckedHandTools.map(t => ({
      Namn: t.name,
      Typ: 'Handredskap',
      Streckkod: t.barcode || '',
      Plats: t.location_name || '',
      Status: t.status,
      Skick: t.condition,
      Inventerad: '',
      Resultat: 'EJ KONTROLLERAD',
    }));

    const allRows = [...checkedRows, ...uncheckedToolRows, ...uncheckedHandToolRows];
    const headers = Object.keys(allRows[0] || { Namn:'',Typ:'',Streckkod:'',Plats:'',Status:'',Skick:'',Inventerad:'',Resultat:'' });

    const csvLines = [
      `Inventeringsrapport - ${selectedLoc ? selectedLoc.name : 'Öppen inventering'} - ${new Date().toLocaleDateString('sv-SE')}`,
      `Kontrollerade: ${checkedCount} / ${totalItems}`,
      '',
      headers.join(';'),
      ...allRows.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(';')),
    ];

    const blob = new Blob(['\ufeff' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventering_${selectedLoc ? selectedLoc.name.replace(/\s/g,'_') : 'open'}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setMode(null);
    setSelectedLocationId('');
    setItemType('both');
    setSessionStarted(false);
    setCheckedIds(new Set());
    setCheckLog([]);
    setScannedItem(null);
    setScannerActive(false);
  };

  // --- SETUP SCREEN ---
  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventeringskontroll</h1>
            <p className="text-gray-500 mt-1">Välj typ av inventering för att starta</p>
          </div>

          {/* Mode selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('location')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'location' ? 'border-[#8B1E1E] bg-[#8B1E1E]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <MapPin className={`w-8 h-8 mb-3 ${mode === 'location' ? 'text-[#8B1E1E]' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-900">Platsinventering</h3>
              <p className="text-sm text-gray-500 mt-1">Inventera ett specifikt kontor eller lager</p>
            </button>

            <button
              onClick={() => setMode('open')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'open' ? 'border-[#8B1E1E] bg-[#8B1E1E]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <Globe className={`w-8 h-8 mb-3 ${mode === 'open' ? 'text-[#8B1E1E]' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-900">Öppen inventering</h3>
              <p className="text-sm text-gray-500 mt-1">Inventera fritt oavsett plats</p>
            </button>
          </div>

          {mode === 'location' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="space-y-2">
                <Label>Välj plats</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj plats..." />
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
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'tools', label: 'Maskiner', icon: Wrench },
                    { value: 'handtools', label: 'Handredskap', icon: Shovel },
                    { value: 'both', label: 'Båda', icon: Package },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setItemType(opt.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${itemType === opt.value ? 'border-[#8B1E1E] bg-[#8B1E1E]/5 text-[#8B1E1E]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <opt.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'open' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="space-y-2">
                <Label>Vad ska inventeras?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'tools', label: 'Maskiner', icon: Wrench },
                    { value: 'handtools', label: 'Handredskap', icon: Shovel },
                    { value: 'both', label: 'Båda', icon: Package },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setItemType(opt.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${itemType === opt.value ? 'border-[#8B1E1E] bg-[#8B1E1E]/5 text-[#8B1E1E]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <opt.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => setSessionStarted(true)}
            disabled={!mode || (mode === 'location' && !selectedLocationId)}
            className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-12 text-base"
          >
            Starta inventering
          </Button>
        </div>
      </div>
    );
  }

  // --- ACTIVE SESSION ---
  const selectedLoc = locations.find(l => l.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventering</h1>
            <p className="text-gray-500 mt-1">
              {selectedLoc ? selectedLoc.name : 'Öppen inventering'} &mdash; {
                itemType === 'tools' ? 'Maskiner' : itemType === 'handtools' ? 'Handredskap' : 'Maskiner & Handredskap'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportExcel} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportera rapport
            </Button>
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Ny inventering
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Framsteg</span>
            <span className="text-sm font-bold text-[#8B1E1E]">{checkedCount} / {totalItems}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[#8B1E1E] h-3 rounded-full transition-all duration-500"
              style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
            />
          </div>
          {checkedCount === totalItems && totalItems > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Alla objekt kontrollerade!</span>
            </div>
          )}
        </div>

        {/* Scanner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Skanna streckkod</h2>
          {!scannerActive ? (
            <div className="space-y-4">
              <Button onClick={() => setScannerActive(true)} className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-14" size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Starta kameraskanner
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500">ELLER</span></div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ange streckkod manuellt"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <Button onClick={handleManualSearch} disabled={!manualBarcode}><Search className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="barcode-scanner" className="rounded-xl overflow-hidden" />
              <Button onClick={() => setScannerActive(false)} variant="outline" className="w-full">Avbryt skanning</Button>
            </div>
          )}
        </div>

        {/* Scanned Item */}
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
                  <Badge variant="outline" className="text-xs">{scannedItemType === 'tool' ? 'Maskin' : 'Handredskap'}</Badge>
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
                    {scannedItemType === 'tool' ? (
                      <>
                        <SelectItem value="available">Tillgänglig</SelectItem>
                        <SelectItem value="in_use">I bruk</SelectItem>
                        <SelectItem value="i_lager">I lager</SelectItem>
                        <SelectItem value="maintenance">Underhåll</SelectItem>
                        <SelectItem value="missing">Saknas</SelectItem>
                        <SelectItem value="retired">Kasserad</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="i_lager">I lager</SelectItem>
                        <SelectItem value="i_bruk">I bruk</SelectItem>
                        <SelectItem value="saknas">Saknas</SelectItem>
                        <SelectItem value="kasserad">Kasserad</SelectItem>
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
                    {scannedItemType === 'tool' ? (
                      <>
                        <SelectItem value="new">Ny</SelectItem>
                        <SelectItem value="good">Bra</SelectItem>
                        <SelectItem value="fair">Okej</SelectItem>
                        <SelectItem value="poor">Dålig</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="ny">Ny</SelectItem>
                        <SelectItem value="bra">Bra</SelectItem>
                        <SelectItem value="okej">Okej</SelectItem>
                        <SelectItem value="dålig">Dålig</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setScannedItem(null)} variant="outline" className="flex-1">Avbryt</Button>
              <Button
                onClick={handleConfirmCheck}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
                disabled={updateToolMutation.isPending || updateHandToolMutation.isPending}
              >
                {(updateToolMutation.isPending || updateHandToolMutation.isPending)
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" />Bekräfta kontroll</>}
              </Button>
            </div>
          </div>
        )}

        {/* Unchecked items */}
        {(uncheckedTools.length > 0 || uncheckedHandTools.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Ej kontrollerade ({uncheckedTools.length + uncheckedHandTools.length})
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...uncheckedTools.map(t => ({...t, _type:'Maskin'})), ...uncheckedHandTools.map(t => ({...t, _type:'Handredskap'}))].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        : <Package className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item._type}{item.barcode ? ` · ${item.barcode}` : ''}</p>
                    </div>
                  </div>
                  {item.location_name && <Badge variant="outline" className="text-xs">{item.location_name}</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}