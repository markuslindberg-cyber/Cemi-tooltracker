import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, X, Upload } from 'lucide-react';

const statusLabels = {
  available: 'Tillgänglig',
  in_use: 'I bruk',
  i_lager: 'I lager',
  maintenance: 'Underhåll',
  missing: 'Saknas',
  retired: 'Kasserad',
  sålda: 'Såld',
};

export default function ToolImportPreviewModal({ rows, existingTools, fileName, onConfirm, onCancel }) {
  const [importing, setImporting] = useState(false);

  // Classify each row as new or update
  const enriched = rows.map(tool => {
    const existing = existingTools.find(t =>
      (tool.tool_number && t.tool_number === tool.tool_number) ||
      (tool.barcode && t.barcode === tool.barcode)
    );
    return { ...tool, _action: existing ? 'update' : 'create', _existingId: existing?.id };
  });

  const newCount = enriched.filter(r => r._action === 'create').length;
  const updateCount = enriched.filter(r => r._action === 'update').length;

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enriched.map((row, idx) => (
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