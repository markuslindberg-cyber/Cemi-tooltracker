import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { buildArtikelSaldoMap } from '@/lib/calculateArtikelSaldo';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';
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
  Pause, Play, PencilLine, Plus, AlertCircle, CloudOff, Cloud,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import LagerkorrigeringSection from '@/components/inventory/LagerkorrigeringSection';

// ─── CSV export ─────────────────────────────────────────────────────────────────
function exportToCSV(sessionConfig, checkedItems, allItems, manualCounts) {
  const date = new Date().toLocaleDateString('sv-SE');
  const locationLabel = sessionConfig.location ? sessionConfig.location.name : 'Öppen inventering';
  const header = ['Namn', 'Typ', 'Kategori', 'Streckkod', 'Plats', 'Status', 'Skick', 'Skannat antal', 'Resultat'];

  const toRow = (item, result) => [
    item.name || item.benamning,
    item._type === 'handtool' ? 'Handredskap' : item._type === 'arbetskläder' ? 'Arbetskläder' : item._type === 'lokalvards' ? 'Lokalvård' : item._type === 'material' ? 'Material' : 'Maskin',
    item.category || item.subcategory || '',
    item.barcode || item.streckkod || '',
    item.location_name || '',
    item.status || '',
    item.condition || '',
    manualCounts[item.id] ?? '',
    result,
  ];

  const checkedRows = allItems.filter(i => checkedItems.has(i.id)).map(i => toRow(i, 'Kontrollerad'));
  const uncheckedRows = allItems.filter(i => !checkedItems.has(i.id)).map(i => toRow(i, 'EJ KONTROLLERAD'));

  const csvContent = [
    [`Inventeringsrapport - ${locationLabel} - ${date}`],
    [`Kontrollerade: ${checkedItems.size} / ${allItems.length}`],
    [],
    header,
    ...checkedRows,
    ...uncheckedRows,
  ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `inventering_${locationLabel.replace(/\s/g, '_')}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Setup Step ──────────────────────────────────────────────────────────────────
function SetupStep({ onStart, pausedSessions, onResume, isLoadingSessions }) {
  const [mode, setMode] = useState('');
  const [locationId, setLocationId] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['all']);

  const toggleType = (value) => {
    if (value === 'all') { setSelectedTypes(['all']); return; }
    setSelectedTypes(prev => {
      const withoutAll = prev.filter(t => t !== 'all');
      if (withoutAll.includes(value)) {
        const next = withoutAll.filter(t => t !== value);
        return next.length === 0 ? ['all'] : next;
      }
      return [...withoutAll, value];
    });
  };

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
  });

  const canStart = mode === 'open' || (mode === 'location' && locationId);
  const selectedLocation = locations.find(l => l.id === locationId);
  const toolType = selectedTypes.includes('all') ? 'all' : selectedTypes.join(',');

  const typeOptions = [
    { value: 'tools', label: 'Maskiner' },
    { value: 'handtools', label: 'Handredskap' },
    { value: 'arbetskläder', label: 'Arbetskläder' },
    { value: 'lokalvards', label: 'Lokalvård' },
    { value: 'material', label: 'Material' },
    { value: 'all', label: 'Alla' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inventeringskontroll</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Välj hur du vill genomföra inventeringen</p>
        </div>

        {/* Paused sessions */}
        {!isLoadingSessions && pausedSessions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <Pause className="w-4 h-4" /> Pausade inventeringar
            </h2>
            <div className="space-y-2">
              {pausedSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{s.location_name || 'Öppen inventering'}</p>
                    <p className="text-xs text-gray-500">
                      {s.tool_type} · Pausad {s.paused_at ? format(new Date(s.paused_at), 'd MMM HH:mm', { locale: sv }) : ''}
                    </p>
                  </div>
                  <Button size="sm" className="bg-[#8B1E1E] hover:bg-[#6B1515]" onClick={() => onResume(s)}>
                    <Play className="w-3.5 h-3.5 mr-1" /> Fortsätt
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('location')}
            className={cn("p-6 rounded-2xl border-2 text-left transition-all",
              mode === 'location' ? "border-[#8B1E1E] bg-[#8B1E1E]/5" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600")}
          >
            <MapPin className={cn("w-8 h-8 mb-3", mode === 'location' ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500")} />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Platsbaserad inventering</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inventera på en specifik plats</p>
          </button>
          <button
            onClick={() => setMode('open')}
            className={cn("p-6 rounded-2xl border-2 text-left transition-all",
              mode === 'open' ? "border-[#8B1E1E] bg-[#8B1E1E]/5" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600")}
          >
            <Globe className={cn("w-8 h-8 mb-3", mode === 'open' ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500")} />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Öppen inventering</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Skanna oberoende av plats</p>
          </button>
        </div>

        {mode && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
            {mode === 'location' && (
              <div className="space-y-2">
                <Label>Välj plats *</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue placeholder="Välj en plats" /></SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.is_active !== false && !l.parent_location_id).map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Vad ska inventeras? <span className="text-xs text-gray-400">(välj en eller flera)</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {typeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleType(opt.value)}
                    className={cn("py-3 px-3 rounded-xl border text-sm font-medium transition-all text-center leading-tight",
                      selectedTypes.includes(opt.value)
                        ? "border-[#8B1E1E] bg-[#8B1E1E] text-white"
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600")}
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
            <ClipboardList className="w-5 h-5 mr-2" />Starta inventering
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Manual count dialog ─────────────────────────────────────────────────────────
function ManualCountDialog({ isOpen, onClose, scopedItems, onConfirm, preselectedItem }) {
  const [query, setQuery] = useState('');
  const [antal, setAntal] = useState('1');
  const [foundItem, setFoundItem] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) { setQuery(''); setAntal('1'); setFoundItem(null); setError(''); setSuccessMsg(''); }
    else if (preselectedItem) { setFoundItem(preselectedItem); setQuery(preselectedItem.name || preselectedItem.benamning || ''); }
  }, [isOpen, preselectedItem]);

  const searchItem = (trimmed) => {
    // For lokalvård items, match only on streckkod (not old_streckkod)
    const getBarcode = (i) => i._type === 'lokalvards' ? i.streckkod : (i.barcode || i.streckkod);
    let item = scopedItems.find(i => getBarcode(i) === trimmed);
    if (!item) item = scopedItems.find(i => i.artikelnummer === trimmed);
    if (!item) item = scopedItems.find(i => (i.name || i.benamning || '').toLowerCase().includes(trimmed.toLowerCase()));
    return item || null;
  };

  const handleSearch = () => {
    setError('');
    setFoundItem(null);
    setSuccessMsg('');
    const trimmed = query.trim();
    if (!trimmed) { setError('Ange streckkod eller namn.'); return; }
    const item = searchItem(trimmed);
    if (!item) { setError(`Artikel '${trimmed}' hittades inte.`); return; }
    setFoundItem(item);
  };

  const handleAdd = () => {
    const q = parseInt(antal, 10);
    if (isNaN(q) || q < 0) { setError('Antal måste vara ett positivt nummer.'); return; }
    const itemName = foundItem.name || foundItem.benamning;
    onConfirm(foundItem, q);
    // Stay open — reset for next article
    setSuccessMsg(`✓ ${itemName} — ${q} st registrerad`);
    setQuery('');
    setAntal('1');
    setFoundItem(null);
    setError('');
    // Re-focus search input for next article
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manuell inmatning</DialogTitle>
          <DialogDescription>Sök på streckkod, artikelnummer eller namn och ange antal i lager. Dialogen stannar öppen så du kan fortsätta med nästa artikel.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{successMsg}
            </div>
          )}
          <div className="grid gap-2">
            <Label>Streckkod / Artikelnummer / Namn</Label>
            <div className="flex gap-2">
              <Input
                ref={searchInputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSuccessMsg(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Sök artikel..."
                autoFocus
              />
              <Button onClick={handleSearch}><Search className="w-4 h-4" /></Button>
            </div>
          </div>
          {foundItem && (
            <div className="p-3 border rounded-md bg-green-50 text-green-800">
              <p className="font-medium">{foundItem.name || foundItem.benamning}</p>
              <p className="text-sm text-green-600">{foundItem.barcode || foundItem.streckkod || ''}</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          <div className="grid gap-2">
            <Label>Antal i lager</Label>
            <Input
              type="number"
              min="0"
              value={antal}
              onChange={e => setAntal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && foundItem && antal !== '') handleAdd(); }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Stäng</Button>
          <Button
            onClick={handleAdd}
            disabled={!foundItem || antal === ''}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            <Plus className="w-4 h-4 mr-2" />Lägg till
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Active Inventory ─────────────────────────────────────────────────────────────
function ActiveInventory({ sessionConfig, onEnd, onPause, sessionId }) {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualDialogPreselected, setManualDialogPreselected] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [checkedItems, setCheckedItems] = useState(new Set(sessionConfig?._resumedChecked || []));
  const [manualCounts, setManualCounts] = useState(sessionConfig?._resumedManualCounts || {});
  const [lastScanFeedback, setLastScanFeedback] = useState(null);
  const [scanLog, setScanLog] = useState([]);
  const [autosaveStatus, setAutosaveStatus] = useState(null); // 'saving' | 'saved' | 'error'
  const externalScanInputRef = useRef(null);
  const endedRef = useRef(false);

  // Refs for autosave — always up to date
  const checkedRef = useRef(checkedItems);
  const manualCountsRef = useRef(manualCounts);
  const lastSavedCheckedRef = useRef(new Set(sessionConfig?._resumedChecked || []));
  const lastSavedManualCountsRef = useRef(sessionConfig?._resumedManualCounts || {});
  const autosaveTimerRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => { checkedRef.current = checkedItems; }, [checkedItems]);
  useEffect(() => { manualCountsRef.current = manualCounts; }, [manualCounts]);

  // ── Background autosave: debounced, non-blocking ──
  const doAutosave = useCallback(async () => {
    if (endedRef.current || !sessionId || isSavingRef.current) return;

    const currentChecked = [...checkedRef.current];
    const currentManual = { ...manualCountsRef.current };

    // Skip if nothing changed since last save
    const lastIds = [...lastSavedCheckedRef.current];
    if (
      currentChecked.length === lastIds.length &&
      currentChecked.every(id => lastSavedCheckedRef.current.has(id)) &&
      JSON.stringify(currentManual) === JSON.stringify(lastSavedManualCountsRef.current)
    ) return;

    isSavingRef.current = true;
    setAutosaveStatus('saving');
    try {
      await base44.entities.InventorySession.update(sessionId, {
        status: 'pågående',
        checked_item_ids: currentChecked,
        manual_counts: currentManual,
        paused_at: new Date().toISOString(),
      });
      lastSavedCheckedRef.current = new Set(currentChecked);
      lastSavedManualCountsRef.current = currentManual;
      setAutosaveStatus('saved');
    } catch {
      setAutosaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [sessionId]);

  // Schedule autosave 5s after any change to checkedItems or manualCounts
  useEffect(() => {
    if (endedRef.current) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(doAutosave, 5000);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [checkedItems, manualCounts, doAutosave]);

  // Also save on beforeunload and unmount as a fallback
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (endedRef.current || !sessionId) return;
      // Use sendBeacon for reliability on page close
      const payload = JSON.stringify({
        status: 'pausad',
        checked_item_ids: [...checkedRef.current],
        manual_counts: manualCountsRef.current,
        paused_at: new Date().toISOString(),
      });
      // Fire-and-forget — best effort
      base44.entities.InventorySession.update(sessionId, JSON.parse(payload)).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // On unmount (navigation away), do a final save if not ended
      if (!endedRef.current && sessionId) {
        base44.entities.InventorySession.update(sessionId, {
          status: 'pausad',
          checked_item_ids: [...checkedRef.current],
          manual_counts: manualCountsRef.current,
          paused_at: new Date().toISOString(),
        }).catch(() => {});
      }
    };
  }, [sessionId]);

  // Disable background refetching during active inventory to prevent re-renders / crashes
  const stableQueryOpts = { refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: Infinity };
  const { data: tools = [] } = useQuery({ queryKey: ['tools'], queryFn: () => base44.entities.Tool.list('-updated_date', 500), ...stableQueryOpts });
  const { data: handTools = [] } = useQuery({ queryKey: ['handtools'], queryFn: () => base44.entities.HandTool.list('-updated_date', 500), ...stableQueryOpts });
  const { data: arbetskläderData = [] } = useQuery({ queryKey: ['arbetskläder'], queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500), ...stableQueryOpts });
  const { data: lokalvardsData = [] } = useQuery({ queryKey: ['lokalvards'], queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 500), ...stableQueryOpts });
  const { data: materialData = [] } = useQuery({ queryKey: ['materialLager'], queryFn: () => base44.entities.MaterialLager.filter({ is_deleted: false }), ...stableQueryOpts });
  const { data: inkopData = [] } = useQuery({ queryKey: ['lokalvardInkop'], queryFn: () => base44.entities.LokalvardInköp.list('-datum', 5000), ...stableQueryOpts });
  const { data: uttagData = [] } = useQuery({ queryKey: ['uttagAll'], queryFn: () => base44.entities.Uttag.list('-datum', 5000), ...stableQueryOpts });
  const { data: checkoutData = [] } = useQuery({ queryKey: ['checkoutAll'], queryFn: () => base44.entities.LokalvardCheckout.list('-checked_out_date', 5000), ...stableQueryOpts });

  // Build dynamic saldo map for lokalvård articles
  const artikelSaldoMap = useMemo(() => {
    if (lokalvardsData.length === 0) return new Map();
    return buildArtikelSaldoMap(lokalvardsData, inkopData, uttagData, checkoutData);
  }, [lokalvardsData, inkopData, uttagData, checkoutData]);

  const getArtikelSaldo = useCallback((artikelId) => {
    return artikelSaldoMap.get(artikelId) ?? 0;
  }, [artikelSaldoMap]);

  const updateToolMutation = useMutation({
    mutationFn: ({ id, data, type }) => {
      if (type === 'handtool') return base44.entities.HandTool.update(id, data);
      if (type === 'arbetskläder') return base44.entities.ArbetskläderUtrustning.update(id, data);
      if (type === 'lokalvards') return base44.entities.LokalvardsArtikel.update(id, data);
      if (type === 'material') return base44.entities.MaterialLager.update(id, data);
      return base44.entities.Tool.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['handtools'] });
      queryClient.invalidateQueries({ queryKey: ['arbetskläder'] });
      queryClient.invalidateQueries({ queryKey: ['lokalvards'] });
      queryClient.invalidateQueries({ queryKey: ['materialLager'] });
    },
  });

  // Build scoped item list
  const scopedItems = useMemo(() => {
    if (!sessionConfig) return [];
    const { mode, locationId, toolType } = sessionConfig;
    const types = toolType === 'all' ? ['tools', 'handtools', 'arbetskläder', 'lokalvards'] : toolType.split(',');
    const include = (t) => types.includes(t);
    let list = [];
    if (include('tools')) {
      let t = tools.map(t => ({ ...t, _type: 'tool' }));
      if (mode === 'location') t = t.filter(t => t.location_id === locationId);
      list = [...list, ...t];
    }
    if (include('handtools')) {
      let t = handTools.map(t => ({ ...t, _type: 'handtool' }));
      if (mode === 'location') t = t.filter(t => t.location_id === locationId);
      list = [...list, ...t];
    }
    if (include('arbetskläder')) {
      let t = arbetskläderData.map(a => ({ ...a, _type: 'arbetskläder' }));
      if (mode === 'location') t = t.filter(a => a.location_id === locationId);
      list = [...list, ...t];
    }
    if (include('lokalvards')) {
      // Include active articles (not deleted) with stock > 0, including utgående (visually marked)
      const t = lokalvardsData
        .filter(l => !l.is_deleted && (artikelSaldoMap.get(l.id) ?? 0) > 0)
        .map(l => ({ ...l, _type: 'lokalvards', name: l.benamning }));
      list = [...list, ...t];
    }
    if (include('material')) {
      let t = materialData.map(m => ({ ...m, _type: 'material', name: m.benamning, barcode: m.artikelnummer }));
      if (mode === 'location') t = t.filter(m => m.location_id === locationId);
      list = [...list, ...t];
    }
    return list;
  }, [tools, handTools, arbetskläderData, lokalvardsData, materialData, sessionConfig, artikelSaldoMap]);

  // Determine if an item uses manual count (lokalvård or arbetskläder with quantity)
  const usesManualCount = (item) => item._type === 'lokalvards' || item._type === 'arbetskläder' || item._type === 'material';

  // Rebuild scan log from resumed session data once scoped items are loaded
  const resumeLogBuiltRef = useRef(false);
  useEffect(() => {
    if (resumeLogBuiltRef.current) return;
    const resumedIds = sessionConfig._resumedChecked;
    if (!resumedIds || resumedIds.length === 0 || scopedItems.length === 0) return;
    resumeLogBuiltRef.current = true;
    const resumedManual = sessionConfig._resumedManualCounts || {};
    const restoredLog = resumedIds.map(id => {
      const item = scopedItems.find(si => si.id === id);
      if (!item) return null;
      return {
        id: item.id,
        name: item.name || item.benamning,
        type: item._type,
        timestamp: new Date(sessionConfig._resumedPausedAt || Date.now()),
        manualCount: resumedManual[id] !== undefined ? resumedManual[id] : undefined,
        resumed: true,
      };
    }).filter(Boolean);
    if (restoredLog.length > 0) {
      setScanLog(prev => [...prev, ...restoredLog]);
    }
  }, [scopedItems, sessionConfig]);

  // Keep external scanner input always focused (unless dialog is open or camera is active)
  useEffect(() => {
    if (!showManualDialog && !scannerActive) {
      const timeout = setTimeout(() => externalScanInputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }
  }, [showManualDialog, scannerActive]);

  const handleScan = useCallback((barcode) => {
    const trimmedBarcode = barcode.trim();
    // Search only within scoped items (or all in open mode)
    let searchList = scopedItems;
    if (sessionConfig?.mode === 'open') {
      searchList = [
        ...tools.map(t => ({ ...t, _type: 'tool' })),
        ...handTools.map(t => ({ ...t, _type: 'handtool' })),
        ...arbetskläderData.map(a => ({ ...a, _type: 'arbetskläder' })),
        ...lokalvardsData.map(l => ({ ...l, _type: 'lokalvards', name: l.benamning })),
        ...materialData.map(m => ({ ...m, _type: 'material', name: m.benamning, barcode: m.artikelnummer })),
      ];
    }
    // For lokalvård items, match only on streckkod (not old_streckkod)
    const getInventoryBarcode = (t) => t._type === 'lokalvards' ? t.streckkod : (t.barcode || t.streckkod);
    const item = searchList.find(t => getInventoryBarcode(t)?.trim() === trimmedBarcode);
    if (item) {
      setCheckedItems(prev => new Set([...prev, item.id]));
      setLastScanFeedback({ name: item.name || item.benamning, found: true });
      // For countable items (lokalvård, arbetskläder, material), increment manualCounts on each scan
      const isCountable = item._type === 'lokalvards' || item._type === 'arbetskläder' || item._type === 'material';
      if (isCountable) {
        setManualCounts(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      }
      setScanLog(prev => {
        const existing = prev.find(e => e.id === item.id);
        if (existing) {
          return prev.map(e => e.id === item.id ? {
            ...e,
            scanCount: (e.scanCount || 1) + 1,
            manualCount: isCountable ? (e.manualCount || 0) + 1 : e.manualCount,
            timestamp: new Date(),
          } : e);
        }
        return [{
          id: item.id, name: item.name || item.benamning, type: item._type,
          timestamp: new Date(), scanCount: 1,
          manualCount: isCountable ? 1 : undefined,
        }, ...prev];
      });
      updateToolMutation.mutate({ id: item.id, data: { last_seen_date: new Date().toISOString() }, type: item._type });
      setTimeout(() => externalScanInputRef.current?.focus(), 50);
    } else {
      setLastScanFeedback({ name: trimmedBarcode, found: false });
    }
  }, [scopedItems, tools, handTools, arbetskläderData, lokalvardsData, materialData, sessionConfig?.mode]);

  useBarcodeCamera("barcode-scanner", scannerActive, handleScan);

  const handleManualSearch = (barcode) => {
    handleScan(barcode);
  };

  const handleManualCountConfirm = (item, antal) => {
    setManualCounts(prev => {
      const existing = prev[item.id] || 0;
      return { ...prev, [item.id]: existing + antal };
    });
    setCheckedItems(prev => new Set([...prev, item.id]));
    setScanLog(prev => {
      const existingEntry = prev.find(e => e.id === item.id);
      if (existingEntry) {
        return prev.map(e => e.id === item.id ? { ...e, manualCount: (e.manualCount || 0) + antal, scanCount: (e.scanCount || 1) + 1, timestamp: new Date() } : e);
      }
      return [{ id: item.id, name: item.name || item.benamning, type: item._type, timestamp: new Date(), manualCount: antal, scanCount: 1 }, ...prev];
    });
  };



  const handlePause = async () => {
    endedRef.current = true;
    clearTimeout(autosaveTimerRef.current);
    await onPause(sessionId, checkedItems, manualCounts);
  };

  const checkedCount = scopedItems.filter(t => checkedItems.has(t.id)).length;
  const totalCount = scopedItems.length;
  const uncheckedItems = scopedItems.filter(t => !checkedItems.has(t.id));
  const isDone = sessionConfig?.mode !== 'open' && checkedCount === totalCount && totalCount > 0;
  const locationLabel = sessionConfig?.location ? sessionConfig.location.name : 'Öppen';
  const typeLabel = sessionConfig?.toolType || sessionConfig?.tool_type || 'Allt';

  if (!sessionConfig) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => { endedRef.current = true; clearTimeout(autosaveTimerRef.current); onEnd(sessionConfig, checkedItems, scopedItems, manualCounts); }} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" aria-label="Avsluta inventering">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventering pågår</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{locationLabel}</Badge>
              <Badge variant="outline">{typeLabel}</Badge>
              {autosaveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" />Sparar...</span>
              )}
              {autosaveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-green-600"><Cloud className="w-3 h-3" />Sparat</span>
              )}
              {autosaveStatus === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-500"><CloudOff className="w-3 h-3" />Sparfel</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePause}>
              <Pause className="w-4 h-4 mr-2" />Pausa
            </Button>
            <Button onClick={() => { endedRef.current = true; clearTimeout(autosaveTimerRef.current); onEnd(sessionConfig, checkedItems, scopedItems, manualCounts); }} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
              <Download className="w-4 h-4 mr-2" />Avsluta & spara
            </Button>
          </div>
        </div>

        {/* Progress */}
        {sessionConfig?.mode !== 'open' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Framsteg</span>
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

        {sessionConfig?.mode === 'open' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#8B1E1E]" />
            <span className="font-medium text-gray-800 dark:text-gray-200">{checkedCount} föremål kontrollerade</span>
          </div>
        )}

        {/* Scanner */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">Skanna streckkod</h2>

          {/* External scanner input — always visible, always focused */}
          {!scannerActive && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Extern skanner / tangentbord — skanna produkt efter produkt
                </Label>
                <div className="flex gap-2">
                  <Input
                    ref={externalScanInputRef}
                    placeholder="Håll här fokus och skanna med extern skanner..."
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => {
                       if (e.key === 'Enter' && manualBarcode.trim()) {
                         handleScan(manualBarcode);
                         setManualBarcode('');
                       }
                     }}
                    className="flex-1 border-2 border-green-300 focus:border-green-500 bg-green-50/30"
                    autoFocus
                    autoComplete="off"
                  />
                  <Button
                    onClick={() => { if (manualBarcode.trim()) { handleScan(manualBarcode); setManualBarcode(''); } }}
                    disabled={!manualBarcode.trim()}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {lastScanFeedback && (
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
                    lastScanFeedback.found
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                  )}>
                    {lastScanFeedback.found
                      ? <><CheckCircle2 className="w-4 h-4" /> Hittad: {lastScanFeedback.name}</>
                      : <><AlertCircle className="w-4 h-4" /> Ingen artikel hittad för: {lastScanFeedback.name}</>}
                  </div>
                )}
              </div>

              <div className="relative">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
               <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">ELLER ANVÄND KAMERA</span></div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setScannerActive(true)} variant="outline" className="flex-1">
                  <Camera className="w-5 h-5 mr-2" />Kameraskanner
                </Button>
                <Button variant="outline" onClick={() => { setManualDialogPreselected(null); setShowManualDialog(true); }} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />Manuell sökning
                </Button>
              </div>
            </div>
          )}

          {scannerActive && (
            <div className="space-y-4">
              <div id="barcode-scanner" className="rounded-xl overflow-hidden" />
              <Button onClick={() => setScannerActive(false)} variant="outline" className="w-full">Avbryt kameraskanning</Button>
            </div>
          )}
        </div>

        <ManualCountDialog
          isOpen={showManualDialog}
          onClose={() => { setShowManualDialog(false); setManualDialogPreselected(null); }}
          scopedItems={scopedItems}
          onConfirm={handleManualCountConfirm}
          preselectedItem={manualDialogPreselected}
        />

        {/* Scan log */}
        {scanLog.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Kontrollerade produkter ({scanLog.length})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {scanLog.map((entry, idx) => (
                <div key={`${entry.id}-${idx}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {entry.name}
                        {manualCounts[entry.id] > 0 && <span className="ml-1.5 text-xs font-normal text-blue-600 dark:text-blue-400">×{manualCounts[entry.id]}</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.type === 'handtool' ? 'Handredskap' : entry.type === 'arbetskläder' ? 'Arbetskläder' : entry.type === 'lokalvards' ? 'Lokalvård' : entry.type === 'material' ? 'Material' : 'Maskin'}
                        {manualCounts[entry.id] !== undefined && ` · Antal: ${manualCounts[entry.id]}`}
                      </p>
                      {entry.type === 'lokalvards' && (() => {
                        const lager = getArtikelSaldo(entry.id);
                        const inv = manualCounts[entry.id] ?? 0;
                        const differs = inv !== lager;
                        return (
                          <p className={cn("text-xs mt-0.5 font-medium", differs ? "text-amber-600" : "text-gray-400")}>
                            Inventerat: {inv} | Lager: {lager}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{entry.timestamp instanceof Date ? entry.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unchecked list */}
        {sessionConfig?.mode !== 'open' && uncheckedItems.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-gray-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Ej kontrollerade ({uncheckedItems.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uncheckedItems.map(item => {
                const isUtgaende = item.utgaende === true;
                return (
                <div key={item.id} className={cn("flex items-center justify-between p-3 rounded-lg", isUtgaende ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-gray-50 dark:bg-gray-800/50")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        : <Package className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {item.name || item.benamning}
                        {item._type === 'lokalvards' && (
                          isUtgaende
                            ? <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">Utgående</span>
                            : <span className="ml-2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">Aktiv</span>
                        )}
                      </p>
                      {(item.barcode || item.streckkod) && <p className="text-xs text-gray-500 dark:text-gray-400">Streckkod: {item.barcode || item.streckkod}</p>}
                      {item._type === 'lokalvards' && (
                        <p className="text-xs mt-0.5 font-medium text-gray-400">
                          Inventerat: 0 | Lager: {getArtikelSaldo(item.id)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item._type === 'handtool' ? 'Handredskap' : item._type === 'arbetskläder' ? 'Arbetskläder' : item._type === 'lokalvards' ? 'Lokalvård' : item._type === 'material' ? 'Material' : 'Maskin'}</Badge>
                    {item.location_name && <Badge variant="outline" className="text-xs">{item.location_name}</Badge>}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Summary Step ────────────────────────────────────────────────────────────────
function SummaryStep({ sessionConfig, checkedItems, allItems, manualCounts, onNew, performedAt }) {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const locationLabel = sessionConfig.location ? sessionConfig.location.name : 'Öppen inventering';
  const typeLabel = sessionConfig.toolType || sessionConfig.tool_type || 'Allt';
  const date = new Date().toLocaleDateString('sv-SE');

  const canCorrect = user?.role === 'admin_lokalvård' || user?.role === 'ägare';
  const hasLokalvard = allItems.some(i => i._type === 'lokalvards');

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventering klar!</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{date}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{locationLabel}</Badge>
            <Badge variant="outline">{typeLabel}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{allItems.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Totalt</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{checkedItems.size}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kontrollerade</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{allItems.length - checkedItems.size}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ej kontrollerade</p>
            </div>
          </div>
        </div>

        {/* Lagerkorrigering – only for admin_lokalvård / ägare, only when lokalvård items exist */}
        {canCorrect && hasLokalvard && (
          <LagerkorrigeringSection
            allItems={allItems}
            manualCounts={manualCounts}
            performedAt={performedAt}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => exportToCSV(sessionConfig, checkedItems, allItems, manualCounts)} className="flex-1 bg-green-700 hover:bg-green-800">
            <Download className="w-4 h-4 mr-2" />Exportera CSV
          </Button>
          <Button onClick={onNew} variant="outline" className="flex-1">Ny inventering</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────────
export default function InventoryCheck() {
  const [phase, setPhase] = useState('loading'); // start with loading to check auto-resume
  const [sessionConfig, setSessionConfig] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [finalChecked, setFinalChecked] = useState(new Set());
  const [finalItems, setFinalItems] = useState([]);
  const [finalManualCounts, setFinalManualCounts] = useState({});
  const [finalPerformedAt, setFinalPerformedAt] = useState(null);
  const autoResumeAttemptedRef = useRef(false);

  const { data: pausedSessions = [], isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['inventorySessions'],
    queryFn: () => base44.entities.InventorySession.filter({ status: 'pausad' }, '-paused_at', 20),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
  });

  // Auto-resume: when data is loaded, check if exactly 1 paused session belongs to current user
  useEffect(() => {
    if (isLoadingSessions || autoResumeAttemptedRef.current || phase !== 'loading') return;
    autoResumeAttemptedRef.current = true;

    (async () => {
      let user = null;
      try { user = await base44.auth.me(); } catch {}
      if (!user?.email) { setPhase('setup'); return; }

      const mySessions = pausedSessions.filter(
        s => s.started_by_email === user.email && s.status === 'pausad'
      );

      if (mySessions.length === 1) {
        const session = mySessions[0];
        const location = locations.find(l => l.id === session.location_id) || null;
        setSessionId(session.id);
        setSessionConfig({
          mode: session.mode,
          location,
          locationId: session.location_id || '',
          toolType: session.tool_type,
          _resumedChecked: session.checked_item_ids || [],
          _resumedManualCounts: session.manual_counts || {},
          _resumedPausedAt: session.paused_at || session.started_at,
        });
        setPhase('active');
      } else {
        setPhase('setup');
      }
    })();
  }, [isLoadingSessions, pausedSessions, locations, phase]);

  const handleStart = async (config) => {
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    const session = await base44.entities.InventorySession.create({
      status: 'pågående',
      mode: config.mode,
      location_id: config.locationId || null,
      location_name: config.location?.name || null,
      tool_type: config.toolType,
      checked_item_ids: [],
      manual_counts: {},
      started_by_email: user?.email || null,
      started_by_name: user?.full_name || null,
      started_at: new Date().toISOString(),
    });
    setSessionId(session.id);
    setSessionConfig(config);
    setPhase('active');
  };

  const handleResume = (session) => {
    const location = locations.find(l => l.id === session.location_id) || null;
    setSessionId(session.id);
    setSessionConfig({
      mode: session.mode,
      location,
      locationId: session.location_id || '',
      toolType: session.tool_type,
      _resumedChecked: session.checked_item_ids || [],
      _resumedManualCounts: session.manual_counts || {},
      _resumedPausedAt: session.paused_at || session.started_at,
    });
    setPhase('active');
  };

  const handlePause = async (sid, checkedItems, manualCounts) => {
    await base44.entities.InventorySession.update(sid, {
      status: 'pausad',
      checked_item_ids: [...checkedItems],
      manual_counts: manualCounts,
      paused_at: new Date().toISOString(),
    });
    refetchSessions();
    setPhase('setup');
    setSessionConfig(null);
    setSessionId(null);
  };

  const handleEnd = async (config, checkedItems, allItems, manualCounts) => {
    const performedAtStr = new Date().toISOString();
    setFinalChecked(checkedItems);
    setFinalItems(allItems);
    setFinalManualCounts(manualCounts);
    setFinalPerformedAt(performedAtStr);
    setPhase('summary');

    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const checkedArr = allItems.filter(i => checkedItems.has(i.id)).map(i => ({
      id: i.id,
      name: i.name || i.benamning,
      type: i._type,
      category: i.category || i.subcategory || '',
      barcode: i.barcode || i.streckkod || '',
      location_name: i.location_name || '',
      status: i.status || '',
      condition: i.condition || '',
      scanned_quantity: manualCounts[i.id] ?? null,
      pris: i.pris ?? null,
      benamning: i.benamning || i.name || '',
    }));
    const uncheckedArr = allItems.filter(i => !checkedItems.has(i.id)).map(i => ({
      id: i.id,
      name: i.name || i.benamning,
      type: i._type,
      category: i.category || i.subcategory || '',
      barcode: i.barcode || i.streckkod || '',
      location_name: i.location_name || '',
      status: i.status || '',
    }));

    await base44.entities.InventoryReport.create({
      location_name: config.location?.name || null,
      location_id: config.locationId || null,
      tool_type: config.toolType,
      mode: config.mode,
      performed_by_name: user?.full_name || null,
      performed_by_email: user?.email || null,
      performed_at: performedAtStr,
      total_items: allItems.length,
      checked_items: checkedItems.size,
      unchecked_items: allItems.length - checkedItems.size,
      manual_counts: manualCounts,
      checked_list: checkedArr,
      unchecked_list: uncheckedArr,
    });

    // Mark session as completed
    if (sessionId) {
      await base44.entities.InventorySession.update(sessionId, { status: 'avslutad' });
    }
    refetchSessions();
  };

  const handleNew = () => {
    setSessionConfig(null);
    setSessionId(null);
    setFinalChecked(new Set());
    setFinalItems([]);
    setFinalManualCounts({});
    setFinalPerformedAt(null);
    setPhase('setup');
  };

  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
  if (phase === 'setup') return <SetupStep onStart={handleStart} pausedSessions={pausedSessions} onResume={handleResume} isLoadingSessions={isLoadingSessions} />;
  if (phase === 'active') return <ActiveInventory sessionConfig={sessionConfig} onEnd={handleEnd} onPause={handlePause} sessionId={sessionId} />;
  if (phase === 'summary') return <SummaryStep sessionConfig={sessionConfig} checkedItems={finalChecked} allItems={finalItems} manualCounts={finalManualCounts} onNew={handleNew} performedAt={finalPerformedAt} />;
  return null;
}