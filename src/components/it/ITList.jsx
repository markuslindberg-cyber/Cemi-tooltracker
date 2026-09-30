import React from 'react';
import { IT_STATUS, typeInfo } from '@/lib/itConstants';

export default function ITList({ items, onOpen }) {
  if (!items.length) return <p className="text-center text-sm text-gray-500 py-16">Ingen IT-utrustning hittades</p>;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
      {items.map(i => {
        const T = typeInfo(i.typ); const s = IT_STATUS[i.status] || IT_STATUS.i_lager;
        return (
          <button key={i.id} onClick={() => onOpen(i)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
            <div className="w-10 h-10 rounded-xl bg-[#8B1E1E]/10 flex items-center justify-center shrink-0"><T.icon className="w-5 h-5 text-[#8B1E1E]" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{i.benamning}</p>
              <p className="text-xs text-gray-500 truncate">{[i.barcode, T.label, i.tillverkare, i.modell].filter(Boolean).join(' · ')}</p>
            </div>
            <p className="hidden md:block text-sm text-gray-600 dark:text-gray-300 w-48 truncate">{i.assigned_to_person_name || '—'}</p>
            <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 ${s.cls}`}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}