import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Calendar, ChevronDown, X, RotateCcw } from 'lucide-react';
import NyttInköpModal from '@/components/lokalvard/NyttInköpModal';
import InkopshistorikTable from '@/components/lokalvard/InkopshistorikTable';
import DubblettInkopTab from '@/components/lokalvard/DubblettInkopTab';

export default function LokalvardInkopshistorik() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('manuella');

  const { data: inköp = [], isLoading: inkopLoading } = useQuery({
    queryKey: ['lokalvardInkop'],
    queryFn: () => base44.entities.LokalvardInköp.list('-created_date', 100000),
    staleTime: 60000,
  });

  const { data: artiklar = [], isLoading: artiklarLoading } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000),
    staleTime: 60000,
  });

  // Build lookup maps
  const artikelMap = useMemo(() => {
    const map = {};
    artiklar.forEach(a => {
      map[a.id] = a;
      if (a.streckkod) map[a.streckkod] = a;
      if (a.old_streckkod) map[a.old_streckkod] = a;
    });
    return map;
  }, [artiklar]);

  const artikelIdSet = useMemo(() => new Set(artiklar.map(a => a.id)), [artiklar]);

  // Resolve and tag each inköp as manual or imported
  const resolvedInköp = useMemo(() => {
    return inköp.map(i => {
      const artikel = artikelMap[i.artikel_id];
      const isManual = artikelIdSet.has(i.artikel_id);
      return {
        ...i,
        benamning: artikel?.benamning || i.artikel_id || 'Okänd artikel',
        streckkod: artikel?.streckkod || i.artikel_id || '',
        artikelLink: artikel?.artikelnummer || artikel?.id || i.artikel_id,
        total_kostnad: (i.antal || 0) * (i.pris || 0),
        manad: i.datum ? i.datum.substring(0, 7) : '',
        source: isManual ? 'manuella' : 'importerade',
      };
    });
  }, [inköp, artikelMap, artikelIdSet]);

  // Split by tab
  const tabFiltered = useMemo(() => {
    return resolvedInköp.filter(i => i.source === activeTab);
  }, [resolvedInköp, activeTab]);

  // Available months for current tab
  const availableMonths = useMemo(() => {
    const months = [...new Set(tabFiltered.map(i => i.manad).filter(Boolean))];
    return months.sort().reverse();
  }, [tabFiltered]);

  // Filter and search
  const filtered = useMemo(() => {
    return tabFiltered.filter(i => {
      const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(i.manad);
      if (!monthMatch) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return i.benamning.toLowerCase().includes(s) ||
        i.streckkod.toLowerCase().includes(s) ||
        (i.artikel_id || '').toLowerCase().includes(s) ||
        (i.ordernummer || '').toLowerCase().includes(s);
    });
  }, [tabFiltered, selectedMonths, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortOrder]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder(col === 'datum' ? 'desc' : 'asc');
    }
  };

  const totalKostnad = filtered.reduce((sum, i) => sum + i.total_kostnad, 0);

  const manuellaCount = resolvedInköp.filter(i => i.source === 'manuella').length;
  const importeradeCount = resolvedInköp.filter(i => i.source === 'importerade').length;

  // Misstänkta dubbletter: samma datum+antal+pris men olika artikel_id
  // Also exclude dismissed groups (stored in localStorage) so the count matches the tab content
  const [dismissedKeysVersion, setDismissedKeysVersion] = useState(0);
  const dubblettCount = useMemo(() => {
    let dismissed;
    try {
      const raw = localStorage.getItem('dubblettInkop_dismissed');
      dismissed = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { dismissed = new Set(); }

    const map = {};
    resolvedInköp.forEach(i => {
      const key = `${i.datum}|${i.antal}|${i.pris}`;
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return Object.values(map).filter(group => {
      if (group.length < 2) return false;
      const uniqueIds = new Set(group.map(g => g.artikel_id));
      if (uniqueIds.size <= 1) return false;
      // Build the same key as DubblettInkopTab
      const artikelIds = [...uniqueIds].sort().join(',');
      const gKey = `${group[0].datum}|${group[0].antal}|${group[0].pris}|${artikelIds}`;
      return !dismissed.has(gKey);
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedInköp, dismissedKeysVersion]);

  if (inkopLoading || artiklarLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 min-h-screen">
      <NyttInköpModal open={showModal} onClose={() => setShowModal(false)} artiklar={artiklar} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">🛒 Inköpshistorik – Lokalvård</h1>
        <Button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-1" /> Nytt inköp
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => { setActiveTab('manuella'); setSelectedMonths([]); }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manuella'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Inköp ({manuellaCount})
        </button>
        <button
          onClick={() => { setActiveTab('importerade'); setSelectedMonths([]); }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'importerade'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Importerade / Inventering ({importeradeCount})
        </button>
        <button
          onClick={() => { setActiveTab('dubbletter'); setSelectedMonths([]); }}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'dubbletter'
              ? 'bg-white text-amber-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Dubbletter {dubblettCount > 0 ? `(${dubblettCount})` : ''}
        </button>
      </div>

      {activeTab !== 'dubbletter' && <>
      {/* Search */}
      <input
        type="text"
        placeholder="Sök artikel eller streckkod..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
      />

      {/* Summary bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-blue-700 font-medium">Totalt {filtered.length} inköp</span>
        <span className="text-xl font-bold text-blue-900">
          {totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-500 uppercase">Månad</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 h-11 px-2 text-sm font-medium text-gray-800 hover:text-blue-600 rounded hover:bg-gray-100">
                {selectedMonths.length === 0 ? 'Alla' : `${selectedMonths.length}`}
                <ChevronDown className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availableMonths.map(m => (
                  <label key={m} className="flex items-center gap-2 h-11 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedMonths.includes(m)}
                      onCheckedChange={checked => setSelectedMonths(prev => checked ? [...prev, m] : prev.filter(x => x !== m))}
                    />
                    <span className="text-sm">{m}</span>
                  </label>
                ))}
              </div>
              {selectedMonths.length > 0 && (
                <button onClick={() => setSelectedMonths([])} className="mt-2 h-9 w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 rounded hover:bg-gray-100">
                  <X className="w-4 h-4" /> Rensa
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {(selectedMonths.length > 0 || search) && (
          <Button variant="outline" onClick={() => { setSelectedMonths([]); setSearch(''); }} className="gap-1 text-sm">
            <RotateCcw className="w-4 h-4" /> Rensa alla
          </Button>
        )}
      </div>
      </>}

      {/* Table / Cards */}
      {activeTab === 'dubbletter' ? (
        <DubblettInkopTab resolvedInköp={resolvedInköp} onRefresh={() => { queryClient.invalidateQueries({ queryKey: ['lokalvardInkop'] }); setDismissedKeysVersion(v => v + 1); }} onDismissChange={() => setDismissedKeysVersion(v => v + 1)} />
      ) : (
        <InkopshistorikTable
          rows={sorted}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}
    </div>
  );
}