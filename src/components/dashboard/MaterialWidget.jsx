import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Boxes, ArrowRight, Package } from 'lucide-react';

const SYFTE_COLORS = {
  internt: 'bg-amber-100 text-amber-700',
  till_forsaljning: 'bg-blue-100 text-blue-700',
};

export default function MaterialWidget() {
  const { data: material = [] } = useQuery({
    queryKey: ['materialWidget'],
    queryFn: () => base44.entities.MaterialLager.filter({ is_deleted: false }),
    staleTime: 30000,
  });

  const totalItems = material.length;
  const totalAntal = material.reduce((s, m) => s + (m.antal || 0), 0);
  const totalValue = material.reduce((s, m) => s + (m.antal || 0) * (m.inkopspris || 0), 0);
  const categories = [...new Set(material.map(m => m.kategori).filter(Boolean))];
  const lowStock = material.filter(m => m.antal <= 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-[#8B1E1E]" />
          Materialbanken
        </h3>
        <Link to="/Materialbanken">
          <Button variant="ghost" size="sm" className="text-[#8B1E1E] hover:text-[#6B1515] hover:bg-[#8B1E1E]/10 h-7 text-xs">
            Visa <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
          <p className="text-xs text-gray-500">Artiklar</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalAntal}</p>
          <p className="text-xs text-gray-500">I lager</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-lg font-bold text-[#8B1E1E]">{totalValue.toLocaleString('sv-SE')}</p>
          <p className="text-xs text-gray-500">Värde (kr)</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">{lowStock.length} artikel{lowStock.length !== 1 ? 'ar' : ''} slut i lager</p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="space-y-1.5">
          {categories.slice(0, 5).map(cat => {
            const items = material.filter(m => m.kategori === cat);
            const count = items.reduce((s, m) => s + (m.antal || 0), 0);
            return (
              <div key={cat} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 truncate">{cat}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 shrink-0">{count} st</span>
              </div>
            );
          })}
          {categories.length > 5 && (
            <p className="text-xs text-gray-400 text-center pt-1">+{categories.length - 5} kategorier till</p>
          )}
        </div>
      )}

      {totalItems === 0 && (
        <div className="text-center py-4">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Inga material ännu</p>
        </div>
      )}
    </div>
  );
}