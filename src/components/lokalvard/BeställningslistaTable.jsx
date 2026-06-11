import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SortIcon = ({ col, sortBy, sortDir }) => {
  if (sortBy !== col) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 text-gray-400 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-[#8B1E1E] inline" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#8B1E1E] inline" />;
};

const TrendBadge = ({ trend }) => {
  if (trend === 'up') return <span className="inline-flex items-center gap-1 text-emerald-600"><TrendingUp className="w-4 h-4" /> Ökande</span>;
  if (trend === 'down') return <span className="inline-flex items-center gap-1 text-red-500"><TrendingDown className="w-4 h-4" /> Minskande</span>;
  return <span className="inline-flex items-center gap-1 text-gray-400"><Minus className="w-4 h-4" /> Stabil</span>;
};

function calcSuggestedQty(item) {
  if (item.avgQtyPerPurchase == null) return null;
  if (item.trend === 'up') return Math.round(item.avgQtyPerPurchase * 1.3);
  if (item.trend === 'down') return Math.round(item.avgQtyPerPurchase * 0.7);
  return Math.round(item.avgQtyPerPurchase);
}

export default function BeställningslistaTable({ items }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('days');
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'sv');
      else if (sortBy === 'stock') cmp = a.currentStock - b.currentStock;
      else if (sortBy === 'days') {
        const aVal = a.daysLeft === Infinity ? 999999 : a.daysLeft;
        const bVal = b.daysLeft === Infinity ? 999999 : b.daysLeft;
        cmp = aVal - bVal;
      } else if (sortBy === 'trend') {
        const order = { up: 2, stable: 1, down: 0 };
        cmp = (order[a.trend] || 0) - (order[b.trend] || 0);
      } else if (sortBy === 'avgQty') {
        cmp = (a.avgQtyPerPurchase || 0) - (b.avgQtyPerPurchase || 0);
      } else if (sortBy === 'lastPurchase') {
        const aVal = a.lastPurchaseDate || '';
        const bVal = b.lastPurchaseDate || '';
        cmp = aVal.localeCompare(bVal);
      } else if (sortBy === 'lastPurchaseQty') {
        cmp = (a.lastPurchaseQty || 0) - (b.lastPurchaseQty || 0);
      } else if (sortBy === 'suggested') {
        cmp = (calcSuggestedQty(a) || 0) - (calcSuggestedQty(b) || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const totalSuggested = items.reduce((s, i) => s + (calcSuggestedQty(i) || 0), 0);
  const totalCost = items.reduce((s, i) => {
    const qty = calcSuggestedQty(i) || 0;
    return s + qty * (i.pris || 0);
  }, 0);

  return (
    <div className="space-y-4">
      <details className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          ℹ️ Om beställningslistan
        </summary>
        <div className="mt-3 space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <p>Listan visar alla produkter (ej utgående) vars beräknade lagersaldo räcker <strong>45 dagar eller mindre</strong>, baserat på genomsnittlig förbrukning de senaste 3 månaderna.</p>
          <ul className="space-y-1.5 mt-2">
            <li><strong>Lager</strong> – Beräknat saldo (totalt inköpt − totalt uttaget).</li>
            <li><strong>Räcker (dagar)</strong> – Uppskattat antal dagar lagret räcker med nuvarande förbrukningstakt.</li>
            <li><strong>Trend</strong> – Jämför 3- och 12-månaderssnittet: Ökande (+10%), Minskande (−10%) eller Stabil.</li>
            <li><strong>Snitt qty/inköp</strong> – Genomsnittligt antal enheter per tidigare inköpstillfälle.</li>
            <li><strong>Senaste inköp</strong> – Datum för det senaste registrerade inköpet.</li>
            <li><strong>Antal sen.</strong> – Antal enheter vid det senaste inköpet.</li>
            <li><strong>Föreslagen best.</strong> – Rekommenderat antal att beställa, baserat på snittvolym per inköp justerat ±30% beroende på trend.</li>
          </ul>
          <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-200" />
              <span>Slut i lager (0 dagar kvar)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200" />
              <span>Lågt lager (≤14 dagar kvar)</span>
            </div>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {items.length} produkter behöver beställas
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Total föreslagen volym: <strong>{totalSuggested} st</strong>
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <p className="text-sm text-green-700 dark:text-green-400">
            Beräknad kostnad: <strong>{Math.round(totalCost).toLocaleString('sv-SE')} kr</strong>
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto hidden lg:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80">
            <TableRow>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs" onClick={() => handleSort('name')}>
                Produktnamn<SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap w-[70px] px-2" onClick={() => handleSort('stock')}>
                Lager<SortIcon col="stock" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap" onClick={() => handleSort('days')}>
                Räcker (dagar)<SortIcon col="days" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs" onClick={() => handleSort('trend')}>
                Trend<SortIcon col="trend" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap" onClick={() => handleSort('avgQty')}>
                Snitt qty/inköp<SortIcon col="avgQty" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap" onClick={() => handleSort('lastPurchase')}>
                Senaste inköp<SortIcon col="lastPurchase" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap w-[70px] px-2" onClick={() => handleSort('lastPurchaseQty')}>
                Antal sen.<SortIcon col="lastPurchaseQty" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap" onClick={() => handleSort('suggested')}>
                Föreslagen best.<SortIcon col="suggested" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                  Inga produkter behöver beställas just nu 🎉
                </TableCell>
              </TableRow>
            ) : sorted.map(item => {
              const isZeroStock = item.daysLeft === 0;
              const isLowStock = !isZeroStock && item.daysLeft <= 14;
              const suggested = calcSuggestedQty(item);

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    isZeroStock && 'bg-red-50 dark:bg-red-950/30',
                    isLowStock && 'bg-orange-50 dark:bg-orange-950/30',
                  )}
                >
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">
                    <button
                      onClick={() => navigate(`/Lokalvard/Artikel/${item.artikelnummer || item.streckkod || item.id}`)}
                      className="text-blue-600 hover:underline text-left truncate"
                    >
                      {item.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums px-2 w-[70px]">
                    <span className={cn(
                      isZeroStock && 'text-red-600 font-semibold',
                      isLowStock && 'text-orange-600 font-semibold',
                    )}>
                      {item.currentStock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span className={cn(
                      isZeroStock && 'text-red-600 font-semibold',
                      isLowStock && 'text-orange-600 font-semibold',
                    )}>
                      {item.daysLeft === Infinity ? '∞' : item.daysLeft}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <TrendBadge trend={item.trend} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {item.avgQtyPerPurchase != null ? `${Math.round(item.avgQtyPerPurchase)} st` : '–'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {item.lastPurchaseDate
                      ? new Date(item.lastPurchaseDate).toLocaleDateString('sv-SE')
                      : '–'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums px-2 w-[70px]">
                    {item.lastPurchaseQty != null ? item.lastPurchaseQty : '–'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-semibold">
                    {suggested != null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8B1E1E]/10 text-[#8B1E1E]">
                        {suggested} st
                      </span>
                    ) : '–'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {sorted.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Inga produkter behöver beställas just nu 🎉</p>
        ) : sorted.map(item => {
          const isZeroStock = item.daysLeft === 0;
          const isLowStock = !isZeroStock && item.daysLeft <= 14;
          const suggested = calcSuggestedQty(item);

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/Lokalvard/Artikel/${item.artikelnummer || item.streckkod || item.id}`)}
              className={cn(
                "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 active:scale-[0.99] transition-transform",
                isZeroStock && 'border-red-300 bg-red-50 dark:bg-red-950/30',
                isLowStock && 'border-orange-300 bg-orange-50 dark:bg-orange-950/30',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-blue-600 dark:text-blue-400 truncate flex-1">{item.name}</p>
                {suggested != null && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8B1E1E]/10 text-[#8B1E1E] text-xs font-bold">
                    Beställ {suggested} st
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <TrendBadge trend={item.trend} />
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  isZeroStock && 'bg-red-100 text-red-700',
                  isLowStock && 'bg-orange-100 text-orange-700',
                  !isZeroStock && !isLowStock && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}>
                  {item.daysLeft === Infinity ? '∞' : item.daysLeft} dagar kvar
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Lager</p>
                  <p className={cn("text-xs font-medium", isZeroStock && 'text-red-600', isLowStock && 'text-orange-600', !isZeroStock && !isLowStock && 'text-gray-700 dark:text-gray-300')}>
                    {item.currentStock} st
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Snitt/inköp</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {item.avgQtyPerPurchase != null ? `${Math.round(item.avgQtyPerPurchase)} st` : '–'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Senaste</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString('sv-SE') : '–'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}