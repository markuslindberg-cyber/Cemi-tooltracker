import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ScanLine, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

const SERVICE_LABELS = {
  repair: 'Reparation', maintenance: 'Underhåll', inspection: 'Inspektion',
  calibration: 'Kalibrering', replacement_parts: 'Reservdelar', annual_service: 'Årlig service',
};

function ServiceEntry({ entry }) {
  return (
    <div className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 rounded p-2 text-xs">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Wrench className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              {SERVICE_LABELS[entry.service_type] || 'Service'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              {entry.performed_by || 'Okänd'}
              {entry.cost > 0 ? ` · ${Number(entry.cost).toLocaleString('sv-SE')} kr` : ''}
              {entry.supplier ? ` · ${entry.supplier}` : ''}
            </p>
            {entry.description && <p className="text-gray-600 dark:text-gray-300 mt-0.5">{entry.description}</p>}
          </div>
        </div>
        <p className="text-gray-400 whitespace-nowrap ml-2 text-[10px]">
          {format(new Date(entry.date), 'HH:mm', { locale: sv })}
        </p>
      </div>
    </div>
  );
}

function ScanEntry({ entry }) {
  return (
    <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded p-2 text-xs">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ScanLine className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-300">Inventerad</p>
            <p className="text-gray-500 dark:text-gray-400">{entry.by_name}{entry.location ? ` · ${entry.location}` : ''}</p>
          </div>
        </div>
        <p className="text-gray-400 whitespace-nowrap ml-2 text-[10px]">
          {format(new Date(entry.date), 'HH:mm', { locale: sv })}
        </p>
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-2 text-xs">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100">{entry.changed_by_name}</p>
        </div>
        <p className="text-gray-400 whitespace-nowrap ml-2 text-[10px]">
          {format(new Date(entry.date), 'HH:mm', { locale: sv })}
        </p>
      </div>
      <div className="mt-1">
        {entry.change_type === 'created' ? (
          <div className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">✓ {entry.field_name}</span>:
            <span className="font-mono bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 ml-1 break-all">{entry.new_value}</span>
          </div>
        ) : (
          <div className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">{entry.field_name}</span>:
            <span className="font-mono bg-red-50 dark:bg-red-900/30 px-1 py-0.5 rounded text-red-700 dark:text-red-400 ml-1 break-all">{entry.old_value || '—'}</span>
            <span className="text-gray-400 mx-1">→</span>
            <span className="font-mono bg-green-50 dark:bg-green-900/30 px-1 py-0.5 rounded text-green-700 dark:text-green-400 break-all">{entry.new_value || '—'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function buildSummary(entries) {
  const parts = [];
  const logEntries = entries.filter(e => e.type === 'log');
  const scans = entries.filter(e => e.type === 'scan');
  const services = entries.filter(e => e.type === 'service');

  if (logEntries.length > 0) {
    const fields = [...new Set(logEntries.map(e => e.field_name))];
    const created = logEntries.filter(e => e.change_type === 'created');
    const updated = logEntries.filter(e => e.change_type === 'updated');
    if (created.length > 0) parts.push(`Skapad (${created.length} fält)`);
    if (updated.length > 0) parts.push(`Ändrat: ${fields.filter(f => updated.some(u => u.field_name === f)).join(', ')}`);
  }
  if (scans.length > 0) parts.push(`Inventerad ${scans.length}x`);
  if (services.length > 0) parts.push(`Service ${services.length}x`);
  return parts.join(' · ');
}

function DateGroup({ dateKey, entries }) {
  const [expanded, setExpanded] = useState(false);
  const summary = useMemo(() => buildSummary(entries), [entries]);
  const dateLabel = format(new Date(dateKey), 'd MMMM yyyy', { locale: sv });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dateLabel}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{entries.length} händelser</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{summary}</p>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-2">
          {entries.map((entry) => {
            if (entry.type === 'service') return <ServiceEntry key={entry.id} entry={entry} />;
            if (entry.type === 'scan') return <ScanEntry key={entry.id} entry={entry} />;
            return <LogEntry key={entry.id} entry={entry} />;
          })}
        </div>
      )}
    </div>
  );
}

export default function ToolLogTab({ toolId }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['toolLogs', toolId],
    queryFn: () => toolId ? base44.entities.ToolLog.filter({ tool_id: toolId }, '-change_date') : Promise.resolve([]),
    enabled: !!toolId,
    staleTime: 0,
  });

  const { data: inventoryReports = [] } = useQuery({
    queryKey: ['inventoryReports'],
    queryFn: () => base44.entities.InventoryReport.list('-performed_at', 200),
    enabled: !!toolId,
  });

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['serviceRecords', toolId],
    queryFn: () => toolId ? base44.entities.ServiceRecord.filter({ tool_id: toolId }, '-service_date', 100) : Promise.resolve([]),
    enabled: !!toolId,
  });

  const scanEntries = useMemo(() => {
    if (!toolId) return [];
    return inventoryReports
      .filter(r => r.checked_list?.some(item => item.id === toolId))
      .map(r => ({
        id: `scan-${r.id}`,
        type: 'scan',
        date: r.performed_at,
        by_name: r.performed_by_name || 'Okänd',
        by_email: r.performed_by_email || '',
        location: r.location_name || 'Öppen inventering',
        mode: r.mode,
      }));
  }, [inventoryReports, toolId]);

  const serviceEntries = useMemo(() => {
    return serviceRecords.map(r => ({
      id: `service-${r.id}`,
      type: 'service',
      date: r.service_date || r.created_date,
      service_type: r.service_type,
      description: r.description,
      performed_by: r.performed_by,
      cost: r.cost,
      supplier: r.supplier,
    }));
  }, [serviceRecords]);

  // Group by date
  const dateGroups = useMemo(() => {
    const logEntries = logs.map(log => ({ ...log, type: 'log', date: log.change_date }));
    const all = [...logEntries, ...scanEntries, ...serviceEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

    const groups = {};
    all.forEach(entry => {
      const key = format(new Date(entry.date), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [logs, scanEntries, serviceEntries]);

  if (dateGroups.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>Ingen ändringshistorik ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dateGroups.map(([dateKey, entries]) => (
        <DateGroup key={dateKey} dateKey={dateKey} entries={entries} />
      ))}
    </div>
  );
}