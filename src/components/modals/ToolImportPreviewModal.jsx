import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, X, Upload, Filter } from 'lucide-react';

const statusLabels = {
  available: 'Tillgänglig',
  in_use: 'I bruk',
  i_lager: 'I lager',
  maintenance: 'Underhåll',
  missing: 'Saknas',
  retired: 'Kasserad',
  sålda: 'Såld',
};

const FIELD_LABELS = {
  name: 'Namn',
  manufacturer: 'Tillverkare',
  model_number: 'Modell',
  category: 'Kategori',
  subcategory: 'Underkategori',
  status: 'Status',
  condition: 'Skick',
  location_name: 'Plats',
  purchase_price: 'Pris',
  purchase_date: 'Inköpsdatum',
  purchase_location: 'Köpt från',
  invoice_number: 'Faktura',
  barcode: 'Streckkod',
  notes: 'Anteckningar',
};

function getChangedFields(row, existing) {
  if (!existing) return [];
  return Object.keys(FIELD_LABELS).filter(field => {
    const newVal = (row[field] ?? '').toString().trim();
    const oldVal = (existing[field] ?? '').toString().trim();
    return newVal !== oldVal && newVal !== '';
  });
}

export default function ToolImportPreviewModal({ rows, existingTools, fileName, onConfirm, onCancel }) {
  const [importing, setImporting] = useState(false);
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'create' | 'update'
  const [changedFieldFilter, setChangedFieldFilter] = useState('all');

  // Classify each row as new or update, and compute changed fields
  const enriched = useMemo(() => rows.map(tool => {
    const existing = existingTools.find(t =>
      (tool.tool_number && t.tool_number === tool.tool_number) ||
      (tool.barcode && t.barcode === tool.barcode)
    );
    const changedFields = existing ? getChangedFields(tool, existing) : [];
    return { ...tool, _action: existing ? 'update' : 'create', _existingId: existing?.id, _existing: existing, _changedFields: changedFields };
  }), [rows, existingTools]);

  const newCount = enriched.filter(r => r._action === 'create').length;
  const updateCount = enriched.filter(r => r._action === 'update').length;

  // All fields that actually change across update rows
  const allChangedFields = useMemo(() => {
    const fields = new Set();
    enriched.filter(r => r._action === 'update').forEach(r => r._changedFields.forEach(f => fields.add(f)));
    return [...fields].sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(row => {
      if (actionFilter === 'create' && row._action !== 'create') return false;
      if (actionFilter === 'update' && row._action !== 'update') return false;
      if (changedFieldFilter !== 'all' && row._action === 'update') {
        if (!row._changedFields.includes(changedFieldFilter)) return false;
      }
      return true;
    });
  }, [enriched, actionFilter, changedFieldFilter]);

  const handleConfirm = async () => {
    setImporting(true);
    await onConfirm(enriched);
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Förhandsgranskning av import</h2>
            <p className="text-sm text-gray-500 mt-0.5">{fileName} — {enriched.length} rader</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">{newCount} nya verktyg skapas</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{updateCount} befintliga uppdateras</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />

          {/* Action filter */}
          <div className="flex items-center gap-1">
            {[
              { value: 'all', label: 'Alla' },
              { value: 'create', label: 'Nya' },
              { value: 'update', label: 'Uppdateras' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setActionFilter(opt.value); if (opt.value !== 'update') setChangedFieldFilter('all'); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  actionFilter === opt.value
                    ? 'bg-[#8B1E1E] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Changed field filter — only shown when viewing updates */}
          {(actionFilter === 'update' || actionFilter === 'all') && allChangedFields.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-gray-400 mr-1">Ändrat fält:</span>
              <button
                onClick={() => setChangedFieldFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  changedFieldFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Alla fält
              </button>
              {allChangedFields.map(field => (
                <button
                  key={field}
                  onClick={() => { setChangedFieldFilter(field); setActionFilter('update'); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    changedFieldFilter === field
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {FIELD_LABELS[field] || field}
                </button>
              ))}
            </div>
          )}

          <span className="ml-auto text-xs text-gray-400">{filtered.length} rader visas</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold">Åtgärd</th>
                <th className="px-3 py-2 text-left font-semibold">Namn</th>
                <th className="px-3 py-2 text-left font-semibold">Tillverkare</th>
                <th className="px-3 py-2 text-left font-semibold">Modell</th>
                <th className="px-3 py-2 text-left font-semibold">Kategori</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Plats</th>
                <th className="px-3 py-2 text-right font-semibold">Pris</th>
                {actionFilter === 'update' || changedFieldFilter !== 'all' ? (
                  <th className="px-3 py-2 text-left font-semibold">Ändrade fält</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row, idx) => (
                <tr key={idx} className={row._action === 'update' ? 'bg-blue-50/50' : 'bg-white'}>
                  <td className="px-3 py-2">
                    {row._action === 'create' ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Ny</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Uppdatera</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">{row.name}</td>
                  <td className="px-3 py-2 text-gray-600">{row.manufacturer || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.model_number || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.category || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{statusLabels[row.status] || row.status || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.location_name || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {row.purchase_price ? `${Number(row.purchase_price).toLocaleString('sv-SE')} kr` : '—'}
                  </td>
                  {actionFilter === 'update' || changedFieldFilter !== 'all' ? (
                    <td className="px-3 py-2">
                      {row._action === 'update' && row._changedFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row._changedFields.map(f => (
                            <span
                              key={f}
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                changedFieldFilter === f
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {FIELD_LABELS[f] || f}
                            </span>
                          ))}
                        </div>
                      ) : row._action === 'update' ? (
                        <span className="text-xs text-gray-400">Inga ändringar</span>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel} disabled={importing}>Avbryt</Button>
          <Button
            onClick={handleConfirm}
            disabled={importing}
            className="bg-[#8B1E1E] hover:bg-[#7a1a1a] gap-2"
          >
            {importing ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Importerar...</>
            ) : (
              <><Upload className="w-4 h-4" />Godkänn och importera ({enriched.length})</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}