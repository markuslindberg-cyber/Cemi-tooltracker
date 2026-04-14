import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, AlertTriangle, Calendar, User, MapPin,
  Package, ChevronDown, ChevronUp, Download, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

function exportReport(report) {
  const date = format(new Date(report.performed_at), 'yyyy-MM-dd');
  const header = ['Namn', 'Typ', 'Kategori', 'Streckkod', 'Plats', 'Status', 'Skick', 'Resultat'];
  const toRow = (item, result) => [item.name, item.type === 'handtool' ? 'Handredskap' : 'Maskin', item.category || '', item.barcode || '', item.location_name || '', item.status || '', item.condition || '', result];
  const rows = [
    ...(report.checked_list || []).map(i => toRow(i, 'Kontrollerad')),
    ...(report.unchecked_list || []).map(i => toRow(i, 'EJ KONTROLLERAD')),
  ];
  const loc = report.location_name || 'Öppen';
  const csv = [
    [`Inventeringsrapport - ${loc} - ${date}`],
    [`Utförd av: ${report.performed_by_name || report.performed_by_email || 'Okänd'}`],
    [`Kontrollerade: ${report.checked_items} / ${report.total_items}`],
    [],
    header,
    ...rows,
  ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `inventering_${loc.replace(/\s/g, '_')}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ReportCard({ report }) {
   const [expanded, setExpanded] = useState(false);
   const unchecked = report.unchecked_list || [];
   const checked = report.checked_list || [];
   const pct = report.total_items > 0 ? Math.round((report.checked_items / report.total_items) * 100) : 0;
   const typeLabel = report.tool_type === 'tools' ? 'Maskiner' : report.tool_type === 'handtools' ? 'Handredskap' : report.tool_type === 'arbetskläder' ? 'Arbetskläder' : report.tool_type === 'lokalvards' ? 'Lokalvård' : 'Maskiner & Handredskap';

   // Group unchecked items by category
   const uncheckedByCategory = {};
   unchecked.forEach(item => {
     const cat = item.category || 'Övrigt';
     if (!uncheckedByCategory[cat]) uncheckedByCategory[cat] = [];
     uncheckedByCategory[cat].push(item);
   });
   const sortedCategories = Object.keys(uncheckedByCategory).sort();

   return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{report.location_name || 'Öppen inventering'}</Badge>
              <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
              {pct === 100
                ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">100% ✓</Badge>
                : <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">{pct}%</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(report.performed_at), 'd MMM yyyy HH:mm', { locale: sv })}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {report.performed_by_name || report.performed_by_email || 'Okänd'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{report.checked_items} kontrollerade</span>
            <span>{report.unchecked_items} saknas</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-[#8B1E1E] h-2 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {unchecked.length > 0 && (
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" /> Ej kontrollerade ({unchecked.length})
              </h4>
              <div className="space-y-4">
                {sortedCategories.map(category => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      {category} ({uncheckedByCategory[category].length})
                    </div>
                    <div className="space-y-2">
                      {uncheckedByCategory[category].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 bg-amber-50 rounded-lg">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <div className="flex items-center gap-2">
                            {item.location_name && <span className="text-xs text-gray-500">{item.location_name}</span>}
                            <Badge variant="outline" className="text-xs">{item.type === 'handtool' ? 'Handredskap' : item.type === 'arbetskläder' ? 'Arbetskläder' : item.type === 'lokalvards' ? 'Lokalvård' : 'Maskin'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {checked.length > 0 && (
            <div className="p-5">
              <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" /> Kontrollerade ({checked.length})
              </h4>
              <div className="space-y-2">
                {checked.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {item.location_name && <span className="text-xs text-gray-500">{item.location_name}</span>}
                      <Badge variant="outline" className="text-xs">{item.type === 'handtool' ? 'Handredskap' : 'Maskin'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryReports() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['inventoryReports'],
    queryFn: () => base44.entities.InventoryReport.list('-performed_at', 100),
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventeringsrapporter</h1>
          <p className="text-gray-500 mt-1">Historik över genomförda inventeringar</p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B1E1E] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Inga rapporter ännu</h3>
            <p className="text-gray-500 text-sm">Genomför en inventering för att se rapporter här</p>
          </div>
        )}

        <div className="space-y-4">
          {reports.map(report => <ReportCard key={report.id} report={report} />)}
        </div>
      </div>
    </div>
  );
}