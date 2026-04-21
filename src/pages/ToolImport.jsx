import React, { useState, useRef, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ToolImport() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [results, setResults] = useState(null);
  const [importLogs, setImportLogs] = useState([]);
  const [logHistory, setLogHistory] = useState([]);
  const [expandedLogIdx, setExpandedLogIdx] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('toolImportHistory');
    if (saved) setLogHistory(JSON.parse(saved));
  }, []);

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(null, 10000).catch(() => []),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(null, 1000).catch(() => []),
  });

  // Get available categories and subcategories from existing tools
  const availableCategories = React.useMemo(() => {
    const categories = [...new Set(tools.map(t => t.category).filter(Boolean))];
    const filtered = categories.filter(cat => !['0', 'ah', 'safety', 'Power_tools', 'Hand_tools'].includes(cat));
    if (!filtered.includes('Redskap')) filtered.push('Redskap');
    if (!filtered.includes('Övrigt')) filtered.push('Övrigt');
    return filtered.sort();
  }, [tools]);

  const getSubcategoriesForCategory = (category) => {
    const categoryToUse = category === 'Redskap' ? 'power_tools' : category;
    return [...new Set(tools.filter(t => t.category === categoryToUse).map(t => t.subcategory).filter(Boolean))].sort();
  };

  const handleDownloadTemplate = () => {
    const headers = ['barcode', 'name', 'manufacturer', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'];
    const exampleRow = ['1234567890', 'Borrmaskin BOSCH', 'BOSCH', 'Maskiner', 'available', 'good', 'Huvudlager', '2026-04-15', '2499.99'];
    const csv = [headers, exampleRow, ...Array(19).fill(Array(9).fill(''))].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tool_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text) => {
    // Säkerställ UTF-8 och ta bort BOM
    let normalized = text;
    // Ta bort UTF-8 BOM om det finns
    if (normalized.charCodeAt(0) === 0xFEFF) {
      normalized = normalized.slice(1);
    }
    normalized = normalized
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const splitLine = (line, sep) => {
      const fields = [];
      let i = 0;
      while (i <= line.length) {
        if (line[i] === '"') {
          let field = '';
          i++;
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') {
              field += '"'; i += 2;
            } else if (line[i] === '"') {
              i++; break;
            } else {
              field += line[i++];
            }
          }
          fields.push(field.trim());
          if (line[i] === sep) i++;
        } else {
          const end = line.indexOf(sep, i);
          if (end === -1) {
            fields.push(line.slice(i).trim());
            break;
          } else {
            fields.push(line.slice(i, end).trim());
            i = end + 1;
          }
        }
      }
      return fields;
    };

    const headerLine = lines[0];
    const candidates = [';', ',', '\t'];
    const sep = candidates.reduce((best, c) =>
      splitLine(headerLine, c).length > splitLine(headerLine, best).length ? c : best
    , candidates[0]);

    const headers = splitLine(headerLine, sep).map(h => h.toLowerCase().trim());

    return lines.slice(1).map(line => {
      const cols = splitLine(line, sep);
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
      return row;
    }).filter(row => (row.barcode || '').trim() || (row.name || '').trim());
  };

  const matchRows = (rawRows) => {
    return rawRows.map(r => {
      const barcode = String(r.barcode || '').trim();
      const matched = tools.find(t => t.barcode === barcode);
      const locationMatch = locations.find(l => l.name === (r.location_name || ''));
      
      const newRow = {
        barcode,
        name: r.name || '',
        manufacturer: r.manufacturer || '',
        category: r.category || '',
        status: r.status || 'available',
        condition: r.condition || 'good',
        location_name: r.location_name || '',
        location_id: locationMatch?.id || '',
        purchase_date: String(r.purchase_date || '').trim(),
        purchase_price: parseFloat(r.purchase_price) || 0,
        matchedTool: matched || null,
        action: matched ? 'update' : 'create',
      };

      // Om uppdatering, beräkna vilka fält som ändras
      if (matched) {
        const changes = {};
        const fields = ['name', 'manufacturer', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'];
        fields.forEach(field => {
          const oldVal = String(matched[field] || '').trim();
          const newVal = String(newRow[field] || '').trim();
          if (oldVal !== newVal && newVal) {
            changes[field] = { old: oldVal || '(tom)', new: newVal };
          }
        });
        newRow.changes = changes;
      }

      return newRow;
    }).filter(r => r.barcode && r.name);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let rows = [];
      if (file.name.endsWith('.csv')) {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);
        rows = parseCSV(text);
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              barcode: { type: 'string' },
              name: { type: 'string' },
              manufacturer: { type: 'string' },
              category: { type: 'string' },
              status: { type: 'string' },
              condition: { type: 'string' },
              location_name: { type: 'string' },
              purchase_date: { type: 'string', description: 'Date YYYY-MM-DD' },
              purchase_price: { type: 'number' }
            }
          }
        });
        if (result.status === 'success' && Array.isArray(result.output)) {
          rows = result.output;
        } else {
          toast.error('Importfel: ' + (result.details || 'Okänt fel'));
          return;
        }
      }

      const matched = matchRows(rows);
      if (rows.length === 0) {
        toast.error('Filen verkar vara tom eller har fel format.');
        return;
      }
      if (matched.length === 0) {
        toast.error(`Inga giltiga rader hittades.`);
        return;
      }
      setPreviewRows(matched);
      setPreviewFileName(file.name);
    } catch (err) {
      toast.error('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!previewRows) return;
    const rowsToSend = previewRows.map((r, idx) => {
      if (r.action === 'ignore') return null;

      // For updates, filter out non-selected fields
      if (r.action === 'update') {
        const filteredChanges = {};
        Object.entries(r.changes || {}).forEach(([field, change]) => {
          const key = `${idx}-${field}`;
          if (selectedUpdates[key] !== false) {
            filteredChanges[field] = change;
          }
        });
        return { ...r, changes: filteredChanges };
      }

      return r;
    }).filter(Boolean);

    if (rowsToSend.length === 0) {
      toast.error('Inga rader redo att importera.');
      return;
    }
    setPreviewRows(null);
    setImporting(true);
    setImportLogs([`Startar import av ${rowsToSend.length} rader från ${previewFileName}...`]);
    try {
      const res = await base44.functions.invoke('processToolImport', { rows: rowsToSend });
      const { results: processedResults } = res.data;
      setResults(processedResults);
      const successCount = processedResults.filter(r => r.status === 'success').length;
      const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
      const errorCount = processedResults.filter(r => r.status === 'error').length;
      setImportLogs([
        `Import slutförd!`,
        `✓ ${successCount} maskiner tillagda/uppdaterade`,
        `⊘ ${skippedCount} hoppade över`,
        `✕ ${errorCount} fel`
      ]);
      const timestamp = new Date().toLocaleString('sv-SE');
      const historyEntry = { timestamp, fileName: previewFileName, successCount, skippedCount, errorCount, totalRows: rowsToSend.length, rows: processedResults };
      const currentHistory = JSON.parse(localStorage.getItem('toolImportHistory') || '[]');
      currentHistory.unshift(historyEntry);
      localStorage.setItem('toolImportHistory', JSON.stringify(currentHistory.slice(0, 50)));
      setLogHistory(currentHistory.slice(0, 50));
    } catch (err) {
      toast.error('Import misslyckades: ' + (err.message || 'Okänt fel'));
    } finally {
      setImporting(false);
    }
  };

  const [expandedRowIdx, setExpandedRowIdx] = useState(null);
  const [selectedUpdates, setSelectedUpdates] = useState({});
  const [editingRowIdx, setEditingRowIdx] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'new', 'update'
  const [sortBy, setSortBy] = useState(null); // null, 'name', or 'barcode'
  const [sortAsc, setSortAsc] = useState(true);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">📥 Importera maskiner</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-blue-900">Instruktioner:</h2>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Ladda ned mallen och fyll i: barcode, namn, tillverkare, kategori, status, skick, plats, inköpsdatum och pris</li>
          <li>Systemet matchar automatiskt streckkoder mot befintliga maskiner</li>
          <li>Rader med matchning uppdaterar befintlig maskin, nya rader skapar nya maskiner</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="hidden lg:flex gap-3">
          <Button onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-2" /> Ladda ned mall
          </Button>
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors ${(uploading || importing || !!previewRows) ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Upload className="w-4 h-4" />
            {uploading ? 'Läser fil...' : 'Välj Excel/CSV-fil'}
            <input type="file" accept=".csv,.xlsx,.xls" onClick={e => { e.target.value = ''; }} onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        {uploading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">Läser och tolkar filen...</span>
          </div>
        )}
        {importing && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            <span className="text-sm text-green-700">Importerar maskiner till databasen...</span>
          </div>
        )}
      </div>

      {previewRows && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Förhandsgranskning ({previewRows.length} rader)</h2>
            
            {(() => {
              const newCount = previewRows.filter(r => r.action !== 'ignore' && !r.matchedTool).length;
              const updateCount = previewRows.filter(r => r.action === 'update' && r.matchedTool && r.changes && Object.keys(r.changes).length > 0).length;
              const noChangeCount = previewRows.filter(r => r.matchedTool && (!r.changes || Object.keys(r.changes).length === 0)).length;
              
              return (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">{newCount}</div>
                    <div className="text-sm text-green-600">Nya maskiner</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-yellow-700">{updateCount}</div>
                    <div className="text-sm text-yellow-600">Maskiner att uppdatera</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-700">{noChangeCount}</div>
                    <div className="text-sm text-gray-600">Utan förändring</div>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex gap-6 text-sm mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span>Ny maskin (skapas)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                <span>Befintlig maskin (uppdateras)</span>
              </div>
            </div>

            {selectedRows.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">{selectedRows.size} maskiner valda - Massuppdatering</p>
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Välj fält</label>
                    <select
                      value={bulkEditField}
                      onChange={(e) => setBulkEditField(e.target.value)}
                      className="border border-blue-300 rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="">- Välj fält -</option>
                      {(() => {
                        const availableFields = new Set();
                        selectedRows.forEach(idx => {
                          if (!previewRows[idx]) return;
                          const row = previewRows[idx];
                          if (!row.matchedTool) {
                            ['name', 'manufacturer', 'model_number', 'serial_number', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'].forEach(f => availableFields.add(f));
                          } else if (row.changes) {
                            Object.keys(row.changes).forEach(f => availableFields.add(f));
                          }
                        });
                        return Array.from(availableFields).sort().map(field => (
                          <option key={field} value={field}>{field}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Nytt värde</label>
                    {bulkEditField === 'status' ? (
                      <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-sm">
                        <option value="">- Välj -</option>
                        <option value="available">Tillgänglig</option>
                        <option value="in_use">I bruk</option>
                        <option value="maintenance">Underhål</option>
                        <option value="missing">Saknas</option>
                        <option value="retired">Kasserad</option>
                        <option value="sålda">Såld</option>
                      </select>
                    ) : bulkEditField === 'condition' ? (
                      <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-sm">
                        <option value="">- Välj -</option>
                        <option value="new">Ny</option>
                        <option value="good">Bra</option>
                        <option value="fair">Okej</option>
                        <option value="poor">Dålig</option>
                      </select>
                    ) : bulkEditField === 'category' ? (
                      <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-sm">
                        <option value="">- Välj -</option>
                        {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    ) : bulkEditField === 'location_name' ? (
                      <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-sm">
                        <option value="">- Välj -</option>
                        {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} placeholder="Ange värde" className="border border-blue-300 rounded px-2 py-1 text-sm" />
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (bulkEditField && bulkEditValue) {
                        const newRows = [...previewRows];
                        selectedRows.forEach(idx => {
                          newRows[idx][bulkEditField] = bulkEditValue;
                        });
                        setPreviewRows(newRows);
                        setSelectedRows(new Set());
                        setBulkEditField('');
                        setBulkEditValue('');
                      }
                    }}
                    disabled={!bulkEditField || !bulkEditValue}
                    className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded text-sm font-medium"
                  >
                    Applicera
                  </button>
                  <button
                    onClick={() => setSelectedRows(new Set())}
                    className="px-3 py-1 border border-blue-300 hover:bg-blue-100 rounded text-sm text-blue-700"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {(() => {
              let filtered = previewRows.map((row, idx) => ({ row, idx })).filter(({ row }) => {
                if (filterMode === 'new') return row.action !== 'ignore' && !row.matchedTool;
                if (filterMode === 'update') return row.action === 'update' && row.matchedTool;
                return row.action !== 'ignore';
              });

              // Apply sorting
              if (sortBy === 'name') {
                filtered.sort((a, b) => {
                  const aVal = (a.row.name || '').toLowerCase();
                  const bVal = (b.row.name || '').toLowerCase();
                  return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                });
              } else if (sortBy === 'barcode') {
                filtered.sort((a, b) => {
                  const aVal = (a.row.barcode || '').toLowerCase();
                  const bVal = (b.row.barcode || '').toLowerCase();
                  return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                });
              }

              return (
                <>
                  <div className="flex gap-2 items-center mb-3 flex-wrap">
                    <select
                      value={filterMode}
                      onChange={(e) => {
                        setFilterMode(e.target.value);
                        setSelectedRows(new Set());
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="all">Alla ({previewRows.filter(r => r.action !== 'ignore').length})</option>
                      <option value="new">Nya maskiner ({previewRows.filter(r => r.action !== 'ignore' && !r.matchedTool).length})</option>
                      <option value="update">Maskiner att uppdatera ({previewRows.filter(r => r.action === 'update' && r.matchedTool).length})</option>
                    </select>

                    <div className="sticky top-0 bg-gray-50 border border-gray-300 rounded-t-lg grid grid-cols-[50px_80px_200px_150px_120px_80px_auto] gap-3 p-3 font-semibold text-sm text-gray-700 z-10">
                      <div>Val</div>
                      <div>Åtgärd</div>
                      <button onClick={() => {
                        if (sortBy === 'name') setSortAsc(!sortAsc);
                        else { setSortBy('name'); setSortAsc(true); }
                      }} className="text-left hover:text-blue-700 cursor-pointer flex items-center gap-1">
                        Namn {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
                      </button>
                      <button onClick={() => {
                        if (sortBy === 'barcode') setSortAsc(!sortAsc);
                        else { setSortBy('barcode'); setSortAsc(true); }
                      }} className="text-left hover:text-blue-700 cursor-pointer flex items-center gap-1">
                        Streckkod {sortBy === 'barcode' && (sortAsc ? '↑' : '↓')}
                      </button>
                      <div>Kategori</div>
                      <div>Status</div>
                      <div>Detaljer</div>
                    </div>

                    {filtered.length > 0 && (
                      <button
                        onClick={() => {
                          if (selectedRows.size === filtered.length) {
                            setSelectedRows(new Set());
                          } else {
                            const newSelected = new Set(selectedRows);
                            filtered.forEach(({ idx }) => newSelected.add(idx));
                            setSelectedRows(newSelected);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedRows.size === filtered.length ? 'Avmarkera alla' : 'Markera alla'}
                      </button>
                    )}

                  <>
                  {filtered.map(({ row, idx }) => {
                    const allFields = ['name', 'manufacturer', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'];
                    const emptyFields = row.action !== 'ignore' 
                      ? allFields.filter(f => !row[f] || row[f] === '' || row[f] === 0)
                      : [];
                    
                    return (
                      <div key={idx}>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${row.matchedTool ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
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
                    <select
                      value={row.action || 'create'}
                      onChange={(e) => {
                        const newRows = [...previewRows];
                        newRows[idx].action = e.target.value;
                        setPreviewRows(newRows);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-24"
                    >
                      {row.matchedTool ? <option value="update">Uppdatera</option> : <option value="create">Skapa ny</option>}
                      <option value="ignore">Ignorera</option>
                    </select>
                    <span className="font-mono text-xs text-gray-600 w-20">{row.barcode}</span>
                    <span className="text-sm font-medium flex-1">{row.name}</span>
                    <span className="text-xs text-gray-500">{row.category}</span>
                    <button
                      onClick={() => setExpandedRowIdx(expandedRowIdx === idx ? null : idx)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {expandedRowIdx === idx ? '▼' : '▶'} 
                      {row.matchedTool && row.changes && Object.keys(row.changes).length > 0 
                        ? ` ${Object.keys(row.changes).length} ändringar`
                        : !row.matchedTool && emptyFields.length > 0
                        ? ` ${emptyFields.length} tomma fält`
                        : ' Visa'}
                    </button>
                    {row.matchedTool && (
                      <button
                        onClick={() => {
                          setEditingRowIdx(idx);
                          setEditFormData({ ...row });
                        }}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        ✏️ Redigera
                      </button>
                    )}
                  </div>
                  {expandedRowIdx === idx && (
                    <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg p-4 space-y-2">
                      {row.matchedTool && row.changes && Object.keys(row.changes).length > 0 ? (
                        // Update mode - show changes
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
                        // Create mode - show empty fields with suggestions
                        <div>
                          {emptyFields.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-gray-700">Tomma fält som kan fyllas i:</p>
                              {emptyFields.map(field => {
                                const fieldLabel = field === 'location_name' ? 'plats' : field === 'purchase_date' ? 'inköpsdatum' : field === 'purchase_price' ? 'inköpspris' : field;
                                const suggestions = field === 'category' 
                                  ? availableCategories 
                                  : field === 'subcategory' && row.category
                                  ? getSubcategoriesForCategory(row.category)
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
                        // Update mode - select which fields to update
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
                  </>
                  ))}
                  </div>
                  <div className="flex gap-3 justify-end mt-4">
          <Button onClick={() => setPreviewRows(null)} variant="outline">Avbryt</Button>
          <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700">Importera</Button>
        </div>
      </div>
    )}

    {editingRowIdx !== null && previewRows && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Redigera maskin</h3>
              <button onClick={() => setEditingRowIdx(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900"><strong>Maskin:</strong> {editFormData.name} ({editFormData.barcode})</p>
                <p className="text-sm text-blue-900"><strong>Befintlig:</strong> {previewRows[editingRowIdx].matchedTool?.name}</p>
              </div>

              <div className="space-y-4">
                {['name', 'manufacturer', 'model_number', 'serial_number', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                    <input
                      type={field === 'purchase_price' ? 'number' : field === 'purchase_date' ? 'date' : 'text'}
                      value={editFormData[field] || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="applyToSimilar"
                    defaultChecked={false}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Applicera samma ändringar på andra maskiner av samma sort (namn, tillverkare, modell)</span>
                </label>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditingRowIdx(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Avbryt</button>
                <button
                  onClick={() => {
                    const applyToSimilar = document.getElementById('applyToSimilar').checked;
                    if (applyToSimilar) {
                      const newRows = [...previewRows];
                      const baseRow = newRows[editingRowIdx];
                      newRows.forEach((row, idx) => {
                        if (idx !== editingRowIdx && row.matchedTool && 
                            row.name === baseRow.name && 
                            row.manufacturer === baseRow.manufacturer && 
                            row.model_number === baseRow.model_number) {
                          Object.keys(editFormData).forEach(key => {
                            row[key] = editFormData[key];
                          });
                        }
                      });
                      newRows[editingRowIdx] = editFormData;
                      setPreviewRows(newRows);
                    } else {
                      const newRows = [...previewRows];
                      newRows[editingRowIdx] = editFormData;
                      setPreviewRows(newRows);
                    }
                    setEditingRowIdx(null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Spara ändringar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importLogs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="bg-white rounded p-3 font-mono text-sm space-y-1 max-h-40 overflow-y-auto">
            {importLogs.map((log, idx) => (
              <div key={idx} className="text-gray-700">{log}</div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Importresultat</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{results.filter(r => r.status === 'success').length}</div>
              <div className="text-sm text-green-600">Tillagda/Uppdaterade</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{results.filter(r => r.status === 'skipped').length}</div>
              <div className="text-sm text-yellow-600">Hoppade över</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{results.filter(r => r.status === 'error').length}</div>
              <div className="text-sm text-red-600">Fel</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">Streckkod</th>
                  <th className="px-4 py-2 text-left font-semibold">Namn</th>
                  <th className="px-4 py-2 text-left font-semibold">Åtgärd</th>
                  <th className="px-4 py-2 text-left font-semibold">Meddelande</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((row, idx) => (
                  <tr key={idx} className={row.status === 'success' ? 'bg-green-50' : row.status === 'skipped' ? 'bg-yellow-50' : 'bg-red-50'}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {row.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {row.status === 'skipped' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                        {row.status === 'error' && <X className="w-4 h-4 text-red-600" />}
                        <span className="text-xs font-medium capitalize">{row.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.barcode}</td>
                    <td className="px-4 py-2 text-xs">{row.name}</td>
                    <td className="px-4 py-2 text-xs capitalize">{row.action}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={() => setResults(null)} variant="outline" className="w-full">Rensa resultat</Button>
        </div>
      )}

      {logHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Importhistorik</h2>
            <button
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              onClick={() => { localStorage.removeItem('toolImportHistory'); setLogHistory([]); }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Rensa historik
            </button>
          </div>
          <div className="divide-y border rounded-lg overflow-hidden">
            {logHistory.map((entry, idx) => (
              <div key={idx}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  onClick={() => setExpandedLogIdx(expandedLogIdx === idx ? null : idx)}
                >
                  {expandedLogIdx === idx
                    ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <span className="font-mono text-xs text-gray-500 w-36 flex-shrink-0">{entry.timestamp}</span>
                  <span className="text-sm text-gray-800 flex-1 truncate">{entry.fileName}</span>
                  <div className="flex gap-3 text-xs flex-shrink-0">
                    <span className="text-green-600 font-semibold">✓ {entry.successCount}</span>
                    <span className="text-yellow-600 font-semibold">⊘ {entry.skippedCount}</span>
                    <span className="text-red-600 font-semibold">✕ {entry.errorCount}</span>
                    <span className="text-gray-400">/ {entry.totalRows} rader</span>
                  </div>
                </button>
                {expandedLogIdx === idx && (
                  <div className="border-t bg-gray-50 px-4 py-3 overflow-x-auto">
                    {!entry.rows ? (
                      <p className="text-xs text-gray-400 italic py-2">Detaljerad logg ej tillgänglig för äldre importer.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="pb-2 text-left font-semibold">Status</th>
                            <th className="pb-2 text-left font-semibold">Streckkod</th>
                            <th className="pb-2 text-left font-semibold">Namn</th>
                            <th className="pb-2 text-left font-semibold">Åtgärd</th>
                            <th className="pb-2 text-left font-semibold">Meddelande</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {entry.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={
                              row.status === 'success' ? 'text-green-800' :
                              row.status === 'skipped' ? 'text-yellow-700' : 'text-red-700'
                            }>
                              <td className="py-1.5 pr-3">
                                <div className="flex items-center gap-1">
                                  {row.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                                  {row.status === 'skipped' && <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />}
                                  {row.status === 'error' && <X className="w-3.5 h-3.5 text-red-600" />}
                                  <span className="font-medium">{row.status}</span>
                                </div>
                              </td>
                              <td className="py-1.5 pr-3 font-mono text-gray-600">{row.barcode}</td>
                              <td className="py-1.5 pr-3 text-gray-800">{row.name}</td>
                              <td className="py-1.5 pr-3 text-gray-600 capitalize">{row.action}</td>
                              <td className="py-1.5 text-gray-500">{row.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      )}
                      </div>
                      )}
                      </div>
                      ))}
                      </div>
                      </div>
                      )}
                      );
                      }