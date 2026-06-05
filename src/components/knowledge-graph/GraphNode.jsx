import React from 'react';
import { CATEGORIES } from './graphData';

export default function GraphNode({ node, isSelected, isHighlighted, onSelect }) {
  const cat = CATEGORIES[node.cat];
  const dimmed = isHighlighted === false;

  return (
    <button
      onClick={() => onSelect(node.id)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm font-medium transition-all duration-200 w-full"
      style={{
        borderColor: isSelected ? cat.color : dimmed ? '#e5e7eb' : `${cat.color}44`,
        backgroundColor: isSelected ? cat.bg : dimmed ? '#f9fafb' : 'white',
        opacity: dimmed ? 0.35 : 1,
        boxShadow: isSelected ? `0 0 0 2px ${cat.color}33` : 'none',
      }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: cat.color }}
      />
      <span className="truncate" style={{ color: dimmed ? '#9ca3af' : '#1f2937' }}>
        {node.label}
      </span>
    </button>
  );
}