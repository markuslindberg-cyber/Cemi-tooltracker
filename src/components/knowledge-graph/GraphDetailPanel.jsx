import React from 'react';
import { CATEGORIES, NODES, EDGES } from './graphData';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

export default function GraphDetailPanel({ nodeId, onClose }) {
  const node = NODES.find(n => n.id === nodeId);
  if (!node) return null;
  const cat = CATEGORIES[node.cat];

  const outgoing = EDGES.filter(e => e.from === nodeId).map(e => ({
    ...e,
    target: NODES.find(n => n.id === e.to),
  })).filter(e => e.target);

  const incoming = EDGES.filter(e => e.to === nodeId).map(e => ({
    ...e,
    source: NODES.find(n => n.id === e.from),
  })).filter(e => e.source);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{node.label}</h3>
            <span className="text-xs font-medium" style={{ color: cat.color }}>{cat.label}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{node.desc}</p>

      {outgoing.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3" /> Ansluter till ({outgoing.length})
          </h4>
          <div className="space-y-1.5">
            {outgoing.map((e, i) => {
              const tc = CATEGORIES[e.target.cat];
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tc.color }} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{e.target.label}</span>
                  <span className="text-gray-400 text-xs">({e.label})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowLeft className="w-3 h-3" /> Ansluts från ({incoming.length})
          </h4>
          <div className="space-y-1.5">
            {incoming.map((e, i) => {
              const sc = CATEGORIES[e.source.cat];
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{e.source.label}</span>
                  <span className="text-gray-400 text-xs">({e.label})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}