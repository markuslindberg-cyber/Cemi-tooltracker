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

  return (
    <div className="space-y-4">
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
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
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
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap hidden sm:table-cell" onClick={() => handleSort('avgQty')}>
                Snitt qty/inköp<SortIcon col="avgQty" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right whitespace-nowrap" onClick={() => handleSort('suggested')}>
                Föreslagen best.<SortIcon col="suggested" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-12">
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
                  <TableCell className="text-right text-sm tabular-nums hidden sm:table-cell">
                    {item.avgQtyPerPurchase != null ? `${Math.round(item.avgQtyPerPurchase)} st` : '–'}
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
    </div>
  );
}