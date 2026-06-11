import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search } from 'lucide-react';
import ProduktstatistikTable from '@/components/lokalvard/ProduktstatistikTable';
import BeställningslistaTable from '@/components/lokalvard/BeställningslistaTable';

export default function LokalvardProduktstatistik() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const { data: artiklar = [], isLoading: loadingArtiklar } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).then(r => r.filter(a => !a.is_deleted)),
    staleTime: 60000,
  });

  const { data: uttag = [], isLoading: loadingUttag } = useQuery({
    queryKey: ['uttag'],
    queryFn: () => base44.entities.Uttag.list('-created_date', 100000).catch(() => []),
    staleTime: 60000,
  });

  const { data: inköp = [], isLoading: loadingInkop } = useQuery({
    queryKey: ['lokalvardInkop'],
    queryFn: () => base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list() : Promise.resolve([]),
    staleTime: 60000,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const d90 = new Date(now);
    d90.setDate(d90.getDate() - 90);
    const d365 = new Date(now);
    d365.setDate(d365.getDate() - 365);

    // Group artiklar by streckkod (same logic as LokalvardLager)
    const groupedByStreckkod = {};
    artiklar.forEach(artikel => {
      const streckkod = artikel.streckkod;
      if (!streckkod) return;

      if (!groupedByStreckkod[streckkod]) {
        groupedByStreckkod[streckkod] = {
          id: artikel.id,
          benamning: artikel.benamning,
          artikelnummer: artikel.artikelnummer,
          inkopsdatum: artikel.inkopsdatum,
          streckkod: artikel.streckkod,
          old_streckkod: artikel.old_streckkod,
          lagertroskelvarde: artikel.lagertroskelvarde,
          utgaende: artikel.utgaende,
          total_antal_inkopta: 0,
          all_artikel_ids: [],
        };
      }

      const currentGroup = groupedByStreckkod[streckkod];
      if (new Date(artikel.inkopsdatum) > new Date(currentGroup.inkopsdatum || '1970-01-01')) {
        currentGroup.id = artikel.id;
        currentGroup.benamning = artikel.benamning;
        currentGroup.lagertroskelvarde = artikel.lagertroskelvarde;
        currentGroup.utgaende = artikel.utgaende;
        if (artikel.old_streckkod) currentGroup.old_streckkod = artikel.old_streckkod;
      } else if (!currentGroup.old_streckkod && artikel.old_streckkod) {
        currentGroup.old_streckkod = artikel.old_streckkod;
      }

      currentGroup.total_antal_inkopta += artikel.antal_inkopta || 0;
      currentGroup.all_artikel_ids.push(artikel.id);
    });

    const groups = Object.values(groupedByStreckkod);

    // Calculate uttag per group (same matching logic as LokalvardLager)
    const calculateUttagForGroup = (group) => {
      if (!Array.isArray(uttag)) return 0;
      return uttag.reduce((sum, u) => {
        const matchingItems = u.artiklar?.filter(item => {
          if (item.benamning && item.benamning.toLowerCase() === group.benamning.toLowerCase()) return true;
          if (item.benamning === group.streckkod || item.benamning === group.old_streckkod) return true;
          if (group.all_artikel_ids.includes(item.artikel_id)) return true;
          if (item.artikel_id === group.streckkod || item.artikel_id === group.old_streckkod) return true;
          return false;
        }) || [];
        return sum + matchingItems.reduce((s, i) => s + (i.antal || 0), 0);
      }, 0);
    };

    const getInköptForGroup = (group) => {
      const matchingInköp = inköp.filter(i => group.all_artikel_ids.includes(i.artikel_id));
      const total = matchingInköp.reduce((sum, i) => sum + (i.antal || 0), 0);
      return total > 0 ? total : group.total_antal_inkopta;
    };

    // Build consumption over time windows per group
    const consumptionByGroup = {};
    groups.forEach(group => {
      consumptionByGroup[group.streckkod] = { last3: 0, last12: 0 };
    });

    uttag.forEach(u => {
      const uttagDate = new Date(u.datum);
      if (!u.artiklar) return;
      u.artiklar.forEach(item => {
        // Find which group this uttag item belongs to
        for (const group of groups) {
          const matches =
            (item.benamning && item.benamning.toLowerCase() === group.benamning.toLowerCase()) ||
            item.benamning === group.streckkod || item.benamning === group.old_streckkod ||
            group.all_artikel_ids.includes(item.artikel_id) ||
            item.artikel_id === group.streckkod || item.artikel_id === group.old_streckkod;

          if (matches) {
            if (uttagDate >= d365) consumptionByGroup[group.streckkod].last12 += item.antal || 0;
            if (uttagDate >= d90) consumptionByGroup[group.streckkod].last3 += item.antal || 0;
            break;
          }
        }
      });
    });

    return groups
      .filter(group => {
        const saldo = getInköptForGroup(group) - calculateUttagForGroup(group);
        // Filter out utgående with 0 saldo
        return !(group.utgaende && saldo <= 0);
      })
      .map(group => {
        const saldo = getInköptForGroup(group) - calculateUttagForGroup(group);
        const c = consumptionByGroup[group.streckkod] || { last3: 0, last12: 0 };
        const avg3 = c.last3 / 3;
        const avg12 = c.last12 / 12;
        const avgPerDay = avg3 / 30;

        let trend = 'stable';
        if (avg12 > 0) {
          if (avg3 > avg12 * 1.1) trend = 'up';
          else if (avg3 < avg12 * 0.9) trend = 'down';
        }

        const daysLeft = avgPerDay > 0
          ? Math.round(Math.max(saldo, 0) / avgPerDay)
          : saldo > 0 ? Infinity : 0;

        // Purchase analysis for this group
        const groupInköp = inköp.filter(i => group.all_artikel_ids.includes(i.artikel_id));
        const purchaseCount = groupInköp.length;
        const totalInköptQty = groupInköp.reduce((s, i) => s + (i.antal || 0), 0);
        const avgQtyPerPurchase = purchaseCount > 0 ? totalInköptQty / purchaseCount : null;

        // Average interval between purchases
        let avgPurchaseIntervalDays = null;
        if (purchaseCount >= 2) {
          const dates = groupInköp.map(i => new Date(i.datum)).sort((a, b) => a - b);
          const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
          avgPurchaseIntervalDays = Math.round(totalDays / (purchaseCount - 1));
        }

        return {
          id: group.id,
          name: group.benamning,
          artikelnummer: group.artikelnummer,
          streckkod: group.streckkod,
          currentStock: saldo,
          avg3,
          avg12,
          trend,
          daysLeft,
          purchaseCount,
          avgPurchaseIntervalDays,
          avgQtyPerPurchase,
          utgaende: group.utgaende,
        };
      });
  }, [artiklar, uttag, inköp]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let items = stats;
    if (q) items = items.filter(s => s.name?.toLowerCase().includes(q));

    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'sv');
      else if (sortBy === 'stock') cmp = a.currentStock - b.currentStock;
      else if (sortBy === 'avg3') cmp = a.avg3 - b.avg3;
      else if (sortBy === 'avg12') cmp = a.avg12 - b.avg12;
      else if (sortBy === 'trend') {
        const order = { up: 2, stable: 1, down: 0 };
        cmp = (order[a.trend] || 0) - (order[b.trend] || 0);
      } else if (sortBy === 'purchaseCount') {
        cmp = (a.purchaseCount || 0) - (b.purchaseCount || 0);
      } else if (sortBy === 'avgInterval') {
        const aVal = a.avgPurchaseIntervalDays ?? 999999;
        const bVal = b.avgPurchaseIntervalDays ?? 999999;
        cmp = aVal - bVal;
      } else if (sortBy === 'avgQty') {
        cmp = (a.avgQtyPerPurchase || 0) - (b.avgQtyPerPurchase || 0);
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

  if (loadingArtiklar || loadingUttag || loadingInkop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  const orderItems = useMemo(() => {
    return stats.filter(s => s.daysLeft !== Infinity && s.daysLeft <= 45 && !s.utgaende);
  }, [stats]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Produktstatistik</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Förbrukningsanalys baserad på uttagshistorik – {stats.length} produkter
        </p>
      </div>

      <Tabs defaultValue="statistik" className="space-y-6">
        <TabsList>
          <TabsTrigger value="statistik">Statistik</TabsTrigger>
          <TabsTrigger value="bestallning" className="gap-2">
            Beställningslista
            {orderItems.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                {orderItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistik" className="space-y-6">
          {/* Färgförklaring */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-red-50 border border-red-200" />
              <span className="text-gray-600 dark:text-gray-400">Slut i lager (saldo 0)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-orange-50 border border-orange-200" />
              <span className="text-gray-600 dark:text-gray-400">Lågt lager (&lt;14 dagar kvar)</span>
            </div>
          </div>

          {/* Kolumnförklaring */}
          <details className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              ℹ️ Kolumnförklaring
            </summary>
            <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <li><strong>Lager</strong> – Beräknat saldo (totalt inköpt − totalt uttaget).</li>
              <li><strong>3m</strong> – Genomsnittlig förbrukning per månad senaste 3 månaderna.</li>
              <li><strong>12m</strong> – Genomsnittlig förbrukning per månad senaste 12 månaderna.</li>
              <li><strong>Inköp</strong> – Antal registrerade inköpstillfällen.</li>
              <li><strong>Snittintervall inköp</strong> – Genomsnittligt antal dagar mellan varje inköp.</li>
              <li><strong>Snitt qty/inköp</strong> – Genomsnittligt antal enheter per inköpstillfälle.</li>
              <li><strong>Trend</strong> – Jämför 3- och 12-månaderssnittet: Ökande, Minskande eller Stabil.</li>
              <li><strong>Räcker (dagar)</strong> – Uppskattat antal dagar lagret räcker.</li>
            </ul>
          </details>

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
        </TabsContent>

        <TabsContent value="bestallning">
          <BeställningslistaTable items={orderItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}