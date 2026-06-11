import React from 'react';
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
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/80">
          <TableRow>
            <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs" onClick={() => onSort('name')}>
              Produktnamn<SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
            </TableHead>
            <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right" onClick={() => onSort('stock')}>
              Lagersaldo<SortIcon col="stock" sortBy={sortBy} sortDir={sortDir} />
            </TableHead>
            <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right hidden sm:table-cell" onClick={() => onSort('avg3')}>
              Snitt/mån (3m)<SortIcon col="avg3" sortBy={sortBy} sortDir={sortDir} />
            </TableHead>
            <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right hidden md:table-cell" onClick={() => onSort('avg12')}>
              Snitt/mån (12m)<SortIcon col="avg12" sortBy={sortBy} sortDir={sortDir} />
            </TableHead>
            <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs" onClick={() => onSort('trend')}>
              Trend<SortIcon col="trend" sortBy={sortBy} sortDir={sortDir} />
            </TableHead>
            <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] text-xs text-right" onClick={() => onSort('days')}>
              Räcker (dagar)<SortIcon col="days" sortBy={sortBy} sortDir={sortDir} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-12">
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
                <TableCell className="font-medium text-gray-900 dark:text-gray-100 text-sm max-w-[200px] truncate">
                  {item.name}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={cn(
                    isZeroStock && 'text-red-600 font-semibold',
                    isLowStock && 'text-orange-600 font-semibold',
                  )}>
                    {item.currentStock}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums hidden sm:table-cell">
                  {item.avg3.toFixed(1)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums hidden md:table-cell">
                  {item.avg12.toFixed(1)}
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
  );
}