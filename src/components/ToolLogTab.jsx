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
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-gray-900">{log.changed_by_name}</p>
              <p className="text-sm text-gray-600">{log.changed_by_email}</p>
            </div>
            <p className="text-xs text-gray-500">
              {format(new Date(log.change_date), 'PPpp', { locale: sv })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">{log.field_name}:</span>
            </p>
            {log.change_type === 'created' ? (
              <p className="text-sm text-gray-700 ml-4">
                ✓ Skapat med värde: <span className="font-mono bg-green-50 px-2 py-1 rounded">{log.new_value}</span>
              </p>
            ) : (
              <div className="ml-4 space-y-1">
                <p className="text-sm text-gray-700">
                  Innan: <span className="font-mono bg-red-50 px-2 py-1 rounded text-red-700">{log.old_value || '(tom)'}</span>
                </p>
                <p className="text-sm text-gray-700">
                  Efter: <span className="font-mono bg-green-50 px-2 py-1 rounded text-green-700">{log.new_value || '(tom)'}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}