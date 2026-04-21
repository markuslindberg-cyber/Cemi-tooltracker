import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function ToolImportPreviewTable({
  filtered,
  selectedRows,
  setSelectedRows,
  expandedRowIdx,
  setExpandedRowIdx,
  previewRows,
  setPreviewRows,
  setEditingRowIdx,
  setEditFormData,
  availableCategories,
  locations,
  selectedUpdates,
  setSelectedUpdates,
}) {
  const allFields = ['name', 'manufacturer', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'];

  return (
    <div className="space-y-2">
      {filtered.map(({ row, idx }) => {
        const emptyFields = row.action !== 'ignore' 
          ? allFields.filter(f => !row[f] || row[f] === '' || row[f] === 0)
          : [];
        
        return (
          <div key={idx}>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${row.matchedTool ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="w-4 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedRows.has(idx)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedRows);
                    if (e.target.checked) newSelected.add(idx);
                    else newSelected.delete(idx);
                    setSelectedRows(newSelected);
                  }}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </div>
              <div className="w-24 flex-shrink-0">
                <select
                  value={row.action || 'create'}
                  onChange={(e) => {
                    const newRows = [...previewRows];
                    newRows[idx].action = e.target.value;
                    setPreviewRows(newRows);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                >
                  {row.matchedTool ? <option value="update">Uppdatera</option> : <option value="create">Skapa ny</option>}
                  <option value="ignore">Ignorera</option>
                </select>
              </div>
              <span className="font-mono text-xs text-gray-600 flex-1">{row.barcode}</span>
              <span className="text-sm font-medium flex-1">{row.name}</span>
              <div className="w-20 flex-shrink-0">
                <span className="text-xs text-gray-500">{row.category}</span>
              </div>
              <button
                onClick={() => setExpandedRowIdx(expandedRowIdx === idx ? null : idx)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium text-nowrap ml-2"
              >
                {expandedRowIdx === idx ? '▼' : '▶'} 
                {row.matchedTool && row.changes && Object.keys(row.changes).length > 0 
                  ? ` ${Object.keys(row.changes).length} änd.`
                  : !row.matchedTool && emptyFields.length > 0
                  ? ` ${emptyFields.length} tomma`
                  : ' Visa'}
              </button>
              {row.matchedTool && (
                <button
                  onClick={() => {
                    setEditingRowIdx(idx);
                    setEditFormData({ ...row });
                  }}
                  className="text-xs text-green-600 hover:text-green-800 font-medium ml-1"
                >
                  ✏️
                </button>
              )}
            </div>
            {expandedRowIdx === idx && (
              <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg p-4 space-y-2">
                {row.matchedTool && row.changes && Object.keys(row.changes).length > 0 ? (
                  Object.entries(row.changes).map(([field, change]) => (
                    <div key={field} className="text-sm">
                      <div className="font-semibold text-gray-700">{field}</div>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <div className="text-xs text-gray-500">Innan:</div>
                          <div className="text-sm bg-red-50 text-red-800 px-2 py-1 rounded font-mono">{change.old}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Nytt:</div>
                          <div className="text-sm bg-green-50 text-green-800 px-2 py-1 rounded font-mono">{change.new}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : !row.matchedTool ? (
                  <div>
                    {emptyFields.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Tomma fält som kan fyllas i:</p>
                        {emptyFields.map(field => {
                          const fieldLabel = field === 'location_name' ? 'plats' : field === 'purchase_date' ? 'inköpsdatum' : field === 'purchase_price' ? 'inköpspris' : field;
                          const suggestions = field === 'category' 
                            ? availableCategories 
                            : field === 'status'
                            ? ['available', 'in_use', 'maintenance', 'missing', 'retired', 'sålda']
                            : field === 'condition'
                            ? ['new', 'good', 'fair', 'poor']
                            : field === 'location_name'
                            ? locations.map(l => l.name)
                            : [];

                          return (
                            <div key={field} className="text-sm">
                              <label className="block text-xs font-medium text-gray-600 mb-1">{fieldLabel}</label>
                              {suggestions.length > 0 ? (
                                <div className="space-y-1">
                                  <select
                                    value={row[field] || ''}
                                    onChange={(e) => {
                                      const newRows = [...previewRows];
                                      newRows[idx][field] = e.target.value;
                                      setPreviewRows(newRows);
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                                  >
                                    <option value="">- Välj {fieldLabel} -</option>
                                    {suggestions.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  {row[field] === '' && <p className="text-xs text-gray-500 italic">eller ange manuellt nedan</p>}
                                </div>
                              ) : null}
                              <input
                                type={field === 'purchase_price' ? 'number' : field === 'purchase_date' ? 'date' : 'text'}
                                value={row[field] || ''}
                                onChange={(e) => {
                                  const newRows = [...previewRows];
                                  newRows[idx][field] = e.target.value;
                                  setPreviewRows(newRows);
                                }}
                                placeholder={`Ange ${fieldLabel}`}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-1"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Alla fält är ifyllda!</p>
                    )}
                  </div>
                ) : row.matchedTool ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Välj vilka fält som ska uppdateras:</p>
                    {allFields.map(field => {
                      const key = `${idx}-${field}`;
                      const isSelected = selectedUpdates[key] !== false && row.changes?.[field];
                      const hasChange = row.changes?.[field];
                      
                      if (!hasChange) return null;
                      
                      return (
                        <div key={field} className="flex items-start gap-3 p-2 border border-gray-200 rounded bg-white">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedUpdates(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }));
                            }}
                            className="mt-1 w-4 h-4 rounded border-gray-300 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-xs text-gray-700 mb-1">{field}</div>
                            <div className="flex gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Innan: </span>
                                <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono">{row.changes[field].old}</span>
                              </div>
                              <span className="text-gray-400">→</span>
                              <div>
                                <span className="text-gray-500">Efter: </span>
                                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono">{row.changes[field].new}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Ingen information att visa</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}