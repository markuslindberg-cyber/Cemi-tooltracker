import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Boxes } from 'lucide-react';

export default function MaterialSection({ unitFilter }) {
  const { data: allMaterials = [], isLoading } = useQuery({
    queryKey: ['materialLagerOwner'],
    queryFn: () => base44.entities.MaterialLager.filter({ is_deleted: false }),
  });

  const materials = unitFilter
    ? allMaterials.filter(m => m.unit_id === unitFilter)
    : allMaterials;

  const iLager = materials.filter(m => m.status === 'i_lager');
  const tillForsaljning = materials.filter(m => m.syfte === 'till_forsaljning' && m.status !== 'såld');
  const salda = materials.filter(m => m.status === 'såld');

  const totalInkopsvarde = iLager.reduce((sum, m) => sum + (m.inkopspris || 0) * (m.antal || 0), 0);
  const totalForsaljningsvarde = tillForsaljning.reduce((sum, m) => {
    const pris = m.forsaljningspris_manuell ?? (m.inkopspris || 0) * 1.3;
    return sum + pris * (m.antal || 0);
  }, 0);
  const totalSaltVarde = salda.reduce((sum, m) => {
    const pris = m.forsaljningspris_manuell ?? (m.inkopspris || 0) * 1.3;
    return sum + pris * (m.antal || 0);
  }, 0);

  const kategorier = [...new Set(iLager.map(m => m.kategori).filter(Boolean))];

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
          <Boxes className="w-5 h-5 text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Materialbanken</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Överblivet material från jobb</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Artiklar i lager</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{iLager.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inköpsvärde i lager</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalInkopsvarde.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Till försäljning</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{tillForsaljning.length} artiklar</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalForsaljningsvarde.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sålt material</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalSaltVarde.toLocaleString('sv-SE')} kr</p>
        </div>
      </div>

      {kategorier.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Per kategori</h3>
          <div className="space-y-2">
            {kategorier.map(kat => {
              const items = iLager.filter(m => m.kategori === kat);
              const value = items.reduce((s, m) => s + (m.inkopspris || 0) * (m.antal || 0), 0);
              return (
                <div key={kat} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{kat}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{items.length} artiklar</span>
                    <span className="text-xs text-gray-400 ml-2">{value.toLocaleString('sv-SE')} kr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}