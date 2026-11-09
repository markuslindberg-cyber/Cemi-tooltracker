import React from 'react';
import { X, Package, Shovel } from 'lucide-react';

export default function ItemRow({ item, action, onRemove }) {
  const Icon = item.type === 'tool' ? Package : Shovel;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {item.type === 'tool' ? 'Maskin' : 'Handredskap'}
          {item.code && ` · ${item.code}`}
          {item.from_location && ` · nu: ${item.from_location}`}
        </p>
      </div>
      {action}
      {onRemove && (
        <button onClick={() => onRemove(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" aria-label="Ta bort">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}