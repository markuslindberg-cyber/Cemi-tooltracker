import React from 'react';
import { CATEGORIES } from './graphData';

export default function GraphLegend({ activeFilter, onFilterChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onFilterChange(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          activeFilter === null
            ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
        }`}
      >
        Alla
      </button>
      {Object.entries(CATEGORIES).map(([key, cat]) => (
        <button
          key={key}
          onClick={() => onFilterChange(activeFilter === key ? null : key)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
          style={{
            backgroundColor: activeFilter === key ? cat.color : 'white',
            color: activeFilter === key ? 'white' : cat.color,
            borderColor: cat.color,
          }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeFilter === key ? 'white' : cat.color }}
            />
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}