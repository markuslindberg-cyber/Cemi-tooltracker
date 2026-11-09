import React from 'react';

export default function AssignSelect({ lists, onAssign }) {
  return (
    <select
      value=""
      onChange={e => e.target.value && onAssign(e.target.value)}
      className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 max-w-[9rem]"
    >
      <option value="">Placera i…</option>
      {lists.map(l => <option key={l.id} value={l.id}>{l.kind === 'sale' ? 'Sälj: ' : 'Flytt: '}{l.name || 'Namnlös'}</option>)}
    </select>
  );
}