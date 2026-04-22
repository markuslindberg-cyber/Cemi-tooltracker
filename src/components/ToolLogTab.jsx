import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function ToolLogTab({ toolId }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['toolLogs', toolId],
    queryFn: () => toolId ? base44.entities.ToolLog.filter({ tool_id: toolId }, '-change_date') : Promise.resolve([]),
    enabled: !!toolId,
  });

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>Ingen ändringshistorik ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="border border-gray-200 rounded p-2 hover:bg-gray-50 transition text-xs">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{log.changed_by_name}</p>
              <p className="text-gray-500">{log.changed_by_email}</p>
            </div>
            <p className="text-gray-400 whitespace-nowrap ml-2">
              {format(new Date(log.change_date), 'dd/MM/yy HH:mm', { locale: sv })}
            </p>
          </div>
          <div className="mt-1 space-y-1">
            {log.change_type === 'created' ? (
              <div className="text-gray-700">
                <span className="font-medium">✓ {log.field_name}</span> skapat:
                <span className="font-mono bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 ml-1 break-all">{log.new_value}</span>
              </div>
            ) : (
              <div className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">{log.field_name}</span> ändrat:
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <span className="font-mono bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-700 dark:text-red-400 break-all">{log.old_value || '—'}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 break-all">{log.new_value || '—'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}