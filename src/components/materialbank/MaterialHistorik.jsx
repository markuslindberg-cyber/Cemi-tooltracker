import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList } from 'lucide-react';
import moment from 'moment';

export default function MaterialHistorik({ materialId }) {
  const { data: uttag = [], isLoading } = useQuery({
    queryKey: ['materialUttag', materialId],
    queryFn: () => base44.entities.MaterialUttag.filter({ material_id: materialId }),
    enabled: !!materialId,
  });

  const sorted = [...uttag].sort((a, b) => new Date(b.datum) - new Date(a.datum));

  if (isLoading) return <div className="animate-pulse h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />;

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        Inga uttag registrerade
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <ClipboardList className="w-4 h-4" />
        Uttagshistorik ({sorted.length})
      </h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sorted.map(u => (
          <div key={u.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {u.antal} {u.enhet || 'st'} → {u.kund_namn}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Order: {u.ordernummer} · {u.uttagen_av_namn}
              </p>
              {u.notering && <p className="text-xs text-gray-400 mt-0.5 italic">{u.notering}</p>}
            </div>
            <span className="text-xs text-gray-400 shrink-0">{moment(u.datum).format('YYYY-MM-DD HH:mm')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}