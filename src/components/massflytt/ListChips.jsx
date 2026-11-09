import React from 'react';
import { Plus, Truck, Tag, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNPLACED } from '@/lib/massMove';

export default function ListChips({ lists, unplacedCount, active, onSelect, onAdd }) {
  const chip = (isActive, tone) => cn(
    'shrink-0 flex items-center gap-2 pl-3 pr-2 py-2 rounded-full border text-sm font-medium transition-all duration-200 active:scale-95',
    isActive ? tone.active : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
  );
  const TONES = {
    move: { active: 'bg-[#8B1E1E] border-[#8B1E1E] text-white shadow-md shadow-[#8B1E1E]/20' },
    sale: { active: 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' },
    unplaced: { active: 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20' },
  };
  const count = (n, isActive) => (
    <span className={cn('min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs flex items-center justify-center', isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800')}>{n}</span>
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {lists.map(l => {
        const isActive = active === l.id;
        const Icon = l.kind === 'sale' ? Tag : Truck;
        return (
          <button key={l.id} onClick={() => onSelect(l.id)} className={chip(isActive, TONES[l.kind])}>
            <Icon className="w-4 h-4" />
            <span className="max-w-[10rem] truncate">{l.name || 'Namnlös'}</span>
            {count(l.items.length, isActive)}
          </button>
        );
      })}
      <button onClick={() => onSelect(UNPLACED)} className={chip(active === UNPLACED, TONES.unplaced)}>
        <Inbox className="w-4 h-4" />
        <span>Ej placerade</span>
        {count(unplacedCount, active === UNPLACED)}
      </button>
      <button onClick={onAdd} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors">
        <Plus className="w-4 h-4" />Ny lista
      </button>
    </div>
  );
}