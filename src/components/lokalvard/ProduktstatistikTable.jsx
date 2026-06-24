import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  if (trend === 'up') return (
    <span className="inline-flex items-center gap-1 text-emerald-600">
      <TrendingUp className="w-4 h-4" /> Ökande
    </span>
  );
  if (trend === 'down') return (
    <span className="inline-flex items-center gap-1 text-red-500">
      <TrendingDown className="w-4 h-4" /> Minskande
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-gray-400">
      <Minus className="w-4 h-4" /> Stabil
    </span>
  );
};

export default function ProduktstatistikTable({ items, sortBy, sortDir, onSort }) {
  const navigate = useNavigate();
  return (
    <>
      {/* Desktop table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto hidden lg:block min-w-0">
        <Table className="w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80">
            <TableRow>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs w-[22%]" onClick={() => onSort('name')}>
                Produktnamn<SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[7%] px-2" onClick={() => onSort('stock')}>
                Lager<SortIcon col="stock" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[6%] px-2" onClick={() => onSort('avg3')}>
                3m<SortIcon col="avg3" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[6%] px-2" onClick={() => onSort('avg12')}>
                12m<SortIcon col="avg12" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[7%] px-2" onClick={() => onSort('purchaseCount')}>
                Inköp<SortIcon col="purchaseCount" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[13%]" onClick={() => onSort('avgInterval')}>
                Snittintervall<SortIcon col="avgInterval" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[16%]" onClick={() => onSort('avgQty')}>
                Snitt qty/inköp<SortIcon col="avgQty" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs w-[12%]" onClick={() => onSort('trend')}>
                Trend<SortIcon col="trend" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right w-[11%]" onClick={() => onSort('days')}>
                Räcker<SortIcon col="days" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-12">
                  Inga produkter matchar sökningen
                </TableCell>
              </TableRow>
            ) : items.map(item => {
              const isZeroStock = item.currentStock === 0;
              const isLowStock = !isZeroStock && item.daysLeft < 14 && item.daysLeft !== Infinity;

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
                  <TableCell className="text-right text-sm tabular-nums px-2 w-[65px]">
                    {item.avg3.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums px-2 w-[65px]">
                    {item.avg12.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums px-2 w-[60px]">
                    {item.purchaseCount}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {item.avgPurchaseIntervalDays != null
                      ? item.avgPurchaseIntervalDays < 60
                        ? `var ${item.avgPurchaseIntervalDays} dagar`
                        : `var ${Math.round(item.avgPurchaseIntervalDays / 30)} mån`
                      : '–'}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span>{item.avgQtyPerPurchase != null ? `${Math.round(item.avgQtyPerPurchase)} st` : '–'}</span>
                    {item.avgQtyPerPurchase != null && item.trend === 'up' && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        ↑ Köp ~{Math.round(item.avgQtyPerPurchase * 1.3)} st
                      </span>
                    )}
                    {item.avgQtyPerPurchase != null && item.trend === 'down' && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        ↓ Köp ~{Math.round(item.avgQtyPerPurchase * 0.7)} st
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <TrendBadge trend={item.trend} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span className={cn(
                      isZeroStock && 'text-red-600 font-semibold',
                      isLowStock && 'text-orange-600 font-semibold',
                    )}>
                      {item.daysLeft === Infinity ? '∞' : item.daysLeft}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Inga produkter matchar sökningen</p>
        ) : items.map(item => {
          const isZeroStock = item.currentStock === 0;
          const isLowStock = !isZeroStock && item.daysLeft < 14 && item.daysLeft !== Infinity;

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
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-lg font-bold tabular-nums",
                    isZeroStock && 'text-red-600',
                    isLowStock && 'text-orange-600',
                    !isZeroStock && !isLowStock && 'text-gray-900 dark:text-gray-100',
                  )}>
                    {item.currentStock}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">i lager</span>
                </div>
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
                  <p className="text-[10px] text-gray-400 uppercase">3m snitt</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.avg3.toFixed(1)}/mån</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">12m snitt</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.avg12.toFixed(1)}/mån</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Inköp</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.purchaseCount} ggr</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}