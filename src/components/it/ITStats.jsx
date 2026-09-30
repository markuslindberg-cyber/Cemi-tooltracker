import React from 'react';
import { IT_STATUS } from '@/lib/itConstants';

export default function ITStats({ items }) {
  const cards = [{ label: 'Totalt', value: items.length }, ...Object.entries(IT_STATUS).map(([k, s]) => ({ label: s.label, value: items.filter(i => i.status === k).length }))];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}