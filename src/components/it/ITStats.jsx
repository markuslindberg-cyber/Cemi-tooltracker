import React from 'react';
import { IT_TYPES } from '@/lib/itConstants';

export default function ITStats({ items }) {
  const stock = items.filter(i => i.status === 'i_lager');
  const cards = [{ label: 'Totalt i lager', value: stock.length }, ...IT_TYPES.map(t => ({ label: t.label, value: stock.filter(i => i.typ === t.id).length }))];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}