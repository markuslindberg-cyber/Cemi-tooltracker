import React from 'react';
import { Pencil, Truck, Tag, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProblem } from '@/lib/massMove';
import ItemRow from './ItemRow';
import AssignSelect from './AssignSelect';

export default function ActiveListPanel({ list, unplaced, lists, onEdit, onRemove, onAssign, onDrop }) {
  const isUnplaced = !list;
  const items = isUnplaced ? unplaced : list.items;
  const problem = list && listProblem(list);
  const Icon = isUnplaced ? Inbox : list.kind === 'sale' ? Tag : Truck;
  const subtitle = isUnplaced
    ? 'Skannade föremål som inte ligger i någon lista'
    : list.kind === 'move'
      ? `Till ${[list.location_name, list.satellite_location_name].filter(Boolean).join(' › ') || '—'}`
      : `Säljs via ${list.sale_place || '—'}${list.sale_date ? ` · ${list.sale_date}` : ''}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
        <Icon className="w-5 h-5 text-gray-400" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{isUnplaced ? 'Ej placerade' : list.name}</h3>
          <p className={problem ? 'text-xs text-red-500' : 'text-xs text-gray-400'}>{problem || subtitle}</p>
        </div>
        {!isUnplaced && <Button size="sm" variant="ghost" onClick={() => onEdit(list)}><Pencil className="w-4 h-4" /></Button>}
      </div>
      <div className="p-2 max-h-[50vh] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Inga föremål ännu – börja skanna.</p>
        ) : items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            onRemove={isUnplaced ? onDrop : onRemove}
            action={isUnplaced && lists.length > 0 ? <AssignSelect lists={lists} onAssign={(id) => onAssign(id, item)} /> : null}
          />
        ))}
      </div>
    </div>
  );
}