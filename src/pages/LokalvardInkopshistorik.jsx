import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Calendar, ChevronDown, ArrowUp, ArrowDown, X, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import NyttInköpModal from '@/components/lokalvard/NyttInköpModal';

export default function LokalvardInkopshistorik() {
  const [search, setSearch] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');

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

  // Build a lookup map: id → artikel, streckkod → artikel
  const artikelMap = useMemo(() => {
    const map = {};
    artiklar.forEach(a => {
      map[a.id] = a;
      if (a.streckkod) map[a.streckkod] = a;
      if (a.old_streckkod) map[a.old_streckkod] = a;
    });
    return map;
  }, [artiklar]);

  // Resolve article name for each inköp
  const resolvedInköp = useMemo(() => {
    return inköp.map(i => {
      const artikel = artikelMap[i.artikel_id];
      return {
        ...i,
        benamning: artikel?.benamning || i.artikel_id || 'Okänd artikel',
        streckkod: artikel?.streckkod || i.artikel_id || '',
        artikelLink: artikel?.artikelnummer || artikel?.id || i.artikel_id,
        total_kostnad: (i.antal || 0) * (i.pris || 0),
        manad: i.datum ? i.datum.substring(0, 7) : '',
      };
    });
  }, [inköp, artikelMap]);

  // Available months for filter
  const availableMonths = useMemo(() => {
    const months = [...new Set(resolvedInköp.map(i => i.manad).filter(Boolean))];
    return months.sort().reverse();
  }, [resolvedInköp]);

  // Filter and search
  const filtered = useMemo(() => {
    return resolvedInköp.filter(i => {
      const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(i.manad);
      if (!monthMatch) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return i.benamning.toLowerCase().includes(s) ||
        i.streckkod.toLowerCase().includes(s) ||
        (i.artikel_id || '').toLowerCase().includes(s);
    });
  }, [resolvedInköp, selectedMonths, search]);

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

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUp className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-600 inline ml-1" />;
  };

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

      {/* Desktop table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-xs" onClick={() => handleSort('datum')}>
                Datum <SortIcon col="datum" />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => handleSort('benamning')}>
                Artikel <SortIcon col="benamning" />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">Streckkod</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => handleSort('antal')}>
                Antal <SortIcon col="antal" />
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => handleSort('pris')}>
                Pris/st <SortIcon col="pris" />
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => handleSort('total_kostnad')}>
                Totalt <SortIcon col="total_kostnad" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900 whitespace-nowrap text-xs">{row.datum}</td>
                <td className="px-3 py-2 font-medium text-xs">
                  <Link to={`/Lokalvard/Artikel/${encodeURIComponent(row.artikelLink)}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {row.benamning}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs font-mono">{row.streckkod}</td>
                <td className="px-3 py-2 text-right text-gray-900 text-xs">{row.antal}</td>
                <td className="px-3 py-2 text-right text-gray-900 text-xs whitespace-nowrap">
                  {row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs whitespace-nowrap">
                  {row.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {sorted.map(row => (
          <div key={row.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <Link to={`/Lokalvard/Artikel/${encodeURIComponent(row.artikelLink)}`} className="font-semibold text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block">
                  {row.benamning}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">{row.streckkod}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 whitespace-nowrap ml-3">
                {row.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </p>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <span>{row.datum}</span>
              <span>{row.antal} st × {row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</span>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-8 text-gray-500">Inga inköp att visa</div>
      )}
    </div>
  );
}