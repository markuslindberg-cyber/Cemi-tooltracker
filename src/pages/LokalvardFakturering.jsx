import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { mergeCheckoutAsUttag, buildArtikelMap } from '@/lib/mergeCheckoutAsUttag';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  FileText, ChevronDown, X, Download, RotateCcw, Filter,
  Loader2, ChevronRight, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MARKUP = 1.5; // 50% påslag

function FilterChip({ label, count, children }) {
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
          <span className="text-gray-800 dark:text-gray-200">{count === 0 ? 'Alla' : `${count} val`}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
      </PopoverTrigger>
      {children}
    </Popover>
  );
}

export default function LokalvardFakturering() {
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState({});

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['faktureringsData'],
    queryFn: async () => {
      const [rawUttag, kunder, artiklar, checkoutRaw] = await Promise.all([
        base44.entities.Uttag.list(null, 10000),
        base44.entities.Kund.list(null, 10000),
        base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
        base44.entities.LokalvardCheckout?.list
          ? base44.entities.LokalvardCheckout.list(null, 100000).catch(() => [])
          : Promise.resolve([]),
      ]);
      const aMap = buildArtikelMap(artiklar);
      const uttag = mergeCheckoutAsUttag(rawUttag, checkoutRaw, aMap);
      return { uttag, kunder, artiklar };
    },
  });

  const uttag = rawData?.uttag || [];
  const kunder = rawData?.kunder || [];
  const artiklar = rawData?.artiklar || [];

  const kundeMap = useMemo(() => {
    const m = {};
    kunder.forEach(k => { m[k.id] = k; });
    return m;
  }, [kunder]);

  const artikelPrisMap = useMemo(() => {
    const m = {};
    artiklar.forEach(a => { m[a.id] = a.pris || 0; });
    return m;
  }, [artiklar]);

  const availablePeriods = useMemo(
    () => [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [uttag]
  );

  // Build aggregated data: per customer → per article
  const aggregated = useMemo(() => {
    const filtered = uttag.filter(u => {
      const periodOk = selectedPeriods.length === 0 || selectedPeriods.includes(u.manad);
      const customerOk = selectedCustomerIds.length === 0 || selectedCustomerIds.includes(u.kund_id);
      return periodOk && customerOk;
    });

    // customer_id → { namn, articles: { artikel_id → { benamning, antal, inkopspris, totalKostnad } } }
    const map = {};
    filtered.forEach(u => {
      if (!u.kund_id) return;
      if (!map[u.kund_id]) {
        const kund = kundeMap[u.kund_id];
        map[u.kund_id] = {
          kund_id: u.kund_id,
          namn: kund?.namn || u.kund_namn || 'Okänd',
          articles: {},
          totalKostnad: 0,
        };
      }
      const cust = map[u.kund_id];
      (u.artiklar || []).forEach(a => {
        const namn = (a.benamning || a.artikel_namn || '').trim().toLowerCase();
        const key = namn || a.artikel_id || 'unknown';
        const pris = a.pris_per_enhet || artikelPrisMap[a.artikel_id] || 0;
        if (!cust.articles[key]) {
          cust.articles[key] = {
            artikel_id: a.artikel_id,
            benamning: a.benamning || a.artikel_namn || 'Okänd artikel',
            antal: 0,
            inkopspris: pris,
            totalKostnad: 0,
          };
        }
        const art = cust.articles[key];
        art.antal += a.antal || 0;
        const lineCost = (a.antal || 0) * pris;
        art.totalKostnad += lineCost;
        cust.totalKostnad += lineCost;
      });
    });

    return Object.values(map)
      .map(c => ({
        ...c,
        articles: Object.values(c.articles).sort((a, b) => b.totalKostnad - a.totalKostnad),
        forslagetPris: c.totalKostnad * MARKUP,
      }))
      .sort((a, b) => b.totalKostnad - a.totalKostnad);
  }, [uttag, selectedPeriods, selectedCustomerIds, kundeMap, artikelPrisMap]);

  const grandTotalKostnad = aggregated.reduce((s, c) => s + c.totalKostnad, 0);
  const grandTotalForslaget = grandTotalKostnad * MARKUP;

  const hasFilters = selectedPeriods.length > 0 || selectedCustomerIds.length > 0;

  const toggleCustomer = (id) => {
    setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {};
    aggregated.forEach(c => { all[c.kund_id] = true; });
    setExpandedCustomers(all);
  };
  const collapseAll = () => setExpandedCustomers({});

  const handleExportCSV = () => {
    const rows = [['Kund', 'Artikel', 'Antal', 'Enhetspris (kr)', 'Total kostnad (kr)', 'Föreslaget utpris (kr)']];
    aggregated.forEach(c => {
      c.articles.forEach(a => {
        rows.push([
          c.namn,
          a.benamning,
          a.antal,
          a.inkopspris.toFixed(2),
          a.totalKostnad.toFixed(2),
          (a.totalKostnad * MARKUP).toFixed(2),
        ]);
      });
      rows.push([c.namn, 'TOTALT', '', '', c.totalKostnad.toFixed(2), c.forslagetPris.toFixed(2)]);
      rows.push([]);
    });
    rows.push(['TOTALT ALLA KUNDER', '', '', '', grandTotalKostnad.toFixed(2), grandTotalForslaget.toFixed(2)]);

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const periodLabel = selectedPeriods.length > 0 ? selectedPeriods.join('_') : 'alla_perioder';
    link.download = `faktureringsunderlag_${periodLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#8B1E1E]" />
            Faktureringsunderlag
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sammanställning av uttag per kund och artikel med föreslaget utpris (+50%)</p>
        </div>
        {aggregated.length > 0 && (
          <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 shrink-0">
            <Download className="w-4 h-4 mr-1" />
            Exportera CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />

        <FilterChip label="Period" count={selectedPeriods.length}>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {availablePeriods.map(p => (
                <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <Checkbox
                    checked={selectedPeriods.includes(p)}
                    onCheckedChange={(checked) => setSelectedPeriods(prev => checked ? [...prev, p] : prev.filter(id => id !== p))}
                  />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>
            {selectedPeriods.length > 0 && (
              <button onClick={() => setSelectedPeriods([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                <X className="w-3 h-3" /> Rensa
              </button>
            )}
          </PopoverContent>
        </FilterChip>

        <FilterChip label="Kund" count={selectedCustomerIds.length}>
          <PopoverContent className="w-60 p-2" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {kunder.sort((a, b) => (a.namn || '').localeCompare(b.namn || '')).map(k => (
                <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <Checkbox
                    checked={selectedCustomerIds.includes(k.id)}
                    onCheckedChange={(checked) => setSelectedCustomerIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id))}
                  />
                  <span className="text-sm">{k.namn}</span>
                </label>
              ))}
            </div>
            {selectedCustomerIds.length > 0 && (
              <button onClick={() => setSelectedCustomerIds([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                <X className="w-3 h-3" /> Rensa
              </button>
            )}
          </PopoverContent>
        </FilterChip>

        {hasFilters && (
          <button
            onClick={() => { setSelectedPeriods([]); setSelectedCustomerIds([]); }}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Rensa alla
          </button>
        )}
      </div>

      {/* Grand total */}
      {aggregated.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#8B1E1E]/5 border-b border-[#8B1E1E]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#8B1E1E]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{aggregated.length} kunder</span>
              {selectedPeriods.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedPeriods.map(p => (
                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={expandAll} className="text-xs text-gray-500 hover:text-gray-700 underline">Visa alla</button>
              <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700 underline">Dölj alla</button>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total kostnad</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{grandTotalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</p>
            </div>
            <div className="px-4 py-3 text-center bg-green-50/50 dark:bg-green-900/10">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Föreslaget utpris (+50%)</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">{grandTotalForslaget.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</p>
            </div>
          </div>
        </div>
      )}

      {/* Per customer breakdown */}
      {aggregated.length > 0 ? (
        <div className="space-y-3">
          {aggregated.map(cust => {
            const isOpen = !!expandedCustomers[cust.kund_id];
            return (
              <div key={cust.kund_id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Customer header row */}
                <button
                  onClick={() => toggleCustomer(cust.kund_id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform shrink-0", isOpen && "rotate-90")} />
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cust.namn}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{cust.articles.length} artiklar</Badge>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Kostnad</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{cust.totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Utpris</p>
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">{cust.forslagetPris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</p>
                    </div>
                  </div>
                </button>

                {/* Article details */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {/* Desktop table */}
                    <div className="hidden sm:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Artikel</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Antal</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Enhetspris</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Kostnad</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Utpris (+50%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {cust.articles.map((a, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                              <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{a.benamning}</td>
                              <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{a.antal} st</td>
                              <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{a.inkopspris.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{a.totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-700 dark:text-green-400">{(a.totalKostnad * MARKUP).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100" colSpan={3}>Totalt {cust.namn}</td>
                            <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{cust.totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</td>
                            <td className="px-4 py-2 text-right font-bold text-green-700 dark:text-green-400">{cust.forslagetPris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800">
                      {cust.articles.map((a, idx) => (
                        <div key={idx} className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{a.benamning}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">{a.antal} st × {a.inkopspris.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</span>
                            <div className="text-right">
                              <span className="text-xs text-gray-500 mr-2">{a.totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</span>
                              <span className="text-xs font-bold text-green-700 dark:text-green-400">{(a.totalKostnad * MARKUP).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Totalt</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mr-3">{cust.totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</span>
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">{cust.forslagetPris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {hasFilters ? 'Inga uttag matchar de valda filtren.' : 'Inga uttag att visa.'}
        </div>
      )}
    </div>
  );
}