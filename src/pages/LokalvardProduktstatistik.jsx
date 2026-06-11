import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import ProduktstatistikTable from '@/components/lokalvard/ProduktstatistikTable';

export default function LokalvardProduktstatistik() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const { data: artiklar = [], isLoading: loadingArtiklar } = useQuery({
    queryKey: ['lokalvardsartiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 2000),
  });

  const { data: uttag = [], isLoading: loadingUttag } = useQuery({
    queryKey: ['uttag-all'],
    queryFn: () => base44.entities.Uttag.list('-datum', 5000),
  });

  const stats = useMemo(() => {
    const now = new Date();
    const d90 = new Date(now);
    d90.setDate(d90.getDate() - 90);
    const d365 = new Date(now);
    d365.setDate(d365.getDate() - 365);

    // Build consumption map: artikel_id -> { last3: number, last12: number }
    const consumption = {};
    uttag.forEach(u => {
      const uttagDate = new Date(u.datum);
      if (!u.artiklar) return;
      u.artiklar.forEach(a => {
        if (!a.artikel_id) return;
        if (!consumption[a.artikel_id]) consumption[a.artikel_id] = { last3: 0, last12: 0 };
        if (uttagDate >= d365) {
          consumption[a.artikel_id].last12 += a.antal || 0;
        }
        if (uttagDate >= d90) {
          consumption[a.artikel_id].last3 += a.antal || 0;
        }
      });
    });

    const activeArtiklar = artiklar.filter(a => !a.is_deleted);

    return activeArtiklar.map(artikel => {
      const c = consumption[artikel.id] || { last3: 0, last12: 0 };
      const avg3 = c.last3 / 3;
      const avg12 = c.last12 / 12;
      const avgPerDay = avg3 / 30;

      let trend = 'stable';
      if (avg3 > avg12 * 1.1) trend = 'up';
      else if (avg3 < avg12 * 0.9) trend = 'down';

      const daysLeft = avgPerDay > 0
        ? Math.round((artikel.current_quantity || 0) / avgPerDay)
        : (artikel.current_quantity || 0) > 0 ? Infinity : 0;

      return {
        id: artikel.id,
        name: artikel.benamning,
        currentStock: artikel.current_quantity || 0,
        avg3,
        avg12,
        trend,
        daysLeft,
      };
    });
  }, [artiklar, uttag]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let items = stats;
    if (q) items = items.filter(s => s.name?.toLowerCase().includes(q));

    return items.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'sv');
      else if (sortBy === 'stock') cmp = a.currentStock - b.currentStock;
      else if (sortBy === 'avg3') cmp = a.avg3 - b.avg3;
      else if (sortBy === 'avg12') cmp = a.avg12 - b.avg12;
      else if (sortBy === 'trend') {
        const order = { up: 2, stable: 1, down: 0 };
        cmp = (order[a.trend] || 0) - (order[b.trend] || 0);
      } else if (sortBy === 'days') {
        const aVal = a.daysLeft === Infinity ? 999999 : a.daysLeft;
        const bVal = b.daysLeft === Infinity ? 999999 : b.daysLeft;
        cmp = aVal - bVal;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [stats, searchQuery, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  if (loadingArtiklar || loadingUttag) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Produktstatistik</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Förbrukningsanalys baserad på uttagshistorik – {stats.length} produkter
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Sök produkt..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ProduktstatistikTable
        items={filtered}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  );
}