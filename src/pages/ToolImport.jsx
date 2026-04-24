import React, { useState, useRef, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import ToolImportPreviewTable from '@/components/ToolImportPreviewTable';

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
  const [expandedRowIdx, setExpandedRowIdx] = useState(null);
  const [selectedUpdates, setSelectedUpdates] = useState({});
  const [editingRowIdx, setEditingRowIdx] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [filterChangedField, setFilterChangedField] = useState('all');
  const [sortBy, setSortBy] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('toolImportHistory');
    if (saved) setLogHistory(JSON.parse(saved));

    // Restore active import state if user navigated away
    const savedState = localStorage.getItem('toolImportActiveState');
    if (savedState) {
      const { previewRows: pr, importLogs: il, results: res, previewFileName: pfn } = JSON.parse(savedState);
      if (pr) setPreviewRows(pr);
      if (il) setImportLogs(il);
      if (res) setResults(res);
      if (pfn) setPreviewFileName(pfn);
    }
  }, []);

  // Persist active state to localStorage whenever it changes
  useEffect(() => {
    const state = { previewRows, importLogs, results, previewFileName };
    if (previewRows || importLogs.length > 0 || results) {
      localStorage.setItem('toolImportActiveState', JSON.stringify(state));
    } else {
      localStorage.removeItem('toolImportActiveState');
    }
  }, [previewRows, importLogs, results, previewFileName]);

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(null, 10000).catch(() => []),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(null, 1000).catch(() => []),
  });

  const availableCategories = React.useMemo(() => {
    const categories = [...new Set(tools.map(t => t.category).filter(Boolean))];
    const filtered = categories.filter(cat => !['0', 'ah', 'safety', 'Power_tools', 'Hand_tools'].includes(cat));
    if (!filtered.includes('Redskap')) filtered.push('Redskap');
    if (!filtered.includes('Övrigt')) filtered.push('Övrigt');
    return filtered.sort();
  }, [tools]);

  const parseCSV = (text) => {
    let normalized = text;
    if (normalized.charCodeAt(0) === 0xFEFF) {
      normalized = normalized.slice(1);
    }
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Parsea RFC 4180 CSV med tvålagerd escape-sekvens
    const parseCSVLine = (line, sep) => {
      const fields = [];
      let i = 0;
      let current = '';
      let inQuotes = false;

      while (i < line.length) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Dubbla citat inom quoted field = en enda citat
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === sep && !inQuotes) {
          // Separator utanför quotes
          fields.push(current);
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      fields.push(current);
      return fields;
    };

    const headerLine = lines[0];
    const candidates = [',', ';', '\t'];
    let sep = ',';
    let maxFields = 0;
    
    for (const c of candidates) {
      const fieldCount = parseCSVLine(headerLine, c).length;
      if (fieldCount > maxFields) {
        maxFields = fieldCount;
        sep = c;
      }
    }

    const headers = parseCSVLine(headerLine, sep).map(h => h.toLowerCase().trim());

    return lines.slice(1)
      .map(line => {
        let processedLine = line;
        
        // Om raden är ett enda quoted field (hela raden mellan citat), extrahera innehållet
        if (processedLine.startsWith('"') && processedLine.endsWith('"')) {
          const innerContent = processedLine.slice(1, -1);
          // Unescape dubbla citat
          processedLine = innerContent.replace(/""/g, '"');
        }
        
        const cols = parseCSVLine(processedLine, sep);
        const row = {};
        headers.forEach((h, i) => { 
          let val = (cols[i] || '').trim();
          row[h] = val;
        });
        return row;
      })
      .filter(row => (row.barcode || '').trim() || (row.name || '').trim());
  };

  // Recompute `changes` for a single row against its matchedTool
  const recomputeChanges = (row) => {
    if (!row.matchedTool) return row;
    const fields = ['name', 'manufacturer', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'];
    const changes = {};
    fields.forEach(field => {
      const oldVal = String(row.matchedTool[field] || '').trim();
      const newVal = String(row[field] || '').trim();
      if (oldVal !== newVal && newVal) {
        changes[field] = { old: oldVal || '(tom)', new: newVal };
      }
    });
    return { ...row, changes };
  };

  const matchRows = (rawRows) => {
    return rawRows.map(r => {
      const barcode = String(r.barcode || '').trim();
      const name = String(r.name || '').trim();
      const toolNumber = String(r.tool_number || '').trim();
      const serialNumber = String(r.serial_number || '').trim();
      
      // Match by barcode first, then by name+tool_number, then by name+serial_number
      let matched = null;
      if (barcode) {
        matched = tools.find(t => t.barcode === barcode);
      }
      if (!matched && name && toolNumber) {
        matched = tools.find(t => (t.name || '').toLowerCase() === name.toLowerCase() && (t.tool_number || '').trim() === toolNumber);
      }
      if (!matched && name && serialNumber) {
        matched = tools.find(t => (t.name || '').toLowerCase() === name.toLowerCase() && (t.serial_number || '').trim() === serialNumber);
      }
      
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
    }).filter(r => r.name);
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'manufacturer', 'model_number', 'serial_number', 'tool_number', 'category', 'subcategory', 'status', 'condition', 'barcode', 'purchase_date', 'purchase_price', 'purchase_location', 'invoice_number', 'service_cost', 'location_name', 'assigned_to_name', 'notes'];
    const exampleRow = ['Impact Driver', 'DeWalt', 'DCF887B', 'SN-123456', 'TOOL-001', 'Power Tools', 'Impact Drivers', 'available', 'good', '', '2026-01-01', '199.99', 'Home Depot', 'INV-001', '500', 'Main Warehouse', 'John Smith', 'Example tool'];
    const emptyRows = Array(19).fill(Array(18).fill(''));
    const csv = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(','),
      ...emptyRows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tool_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
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
    setImportLogs([
      `Startar import av ${rowsToSend.length} rader från ${previewFileName}...`,
      `⏳ Detta kan ta en stund – du kan byta sida och komma tillbaka, resultaten sparas.`
    ]);
    try {
      const res = await base44.functions.invoke('processToolImport', { rows: rowsToSend });
      const { results: processedResults } = res.data;
      setResults(processedResults);
      const successCount = processedResults.filter(r => r.status === 'success').length;
      const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
      const errorCount = processedResults.filter(r => r.status === 'error').length;
      setImportLogs([
        `✅ Import slutförd!`,
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

  // All changed fields across update rows — for filter dropdown
  const allChangedFields = useMemo(() => {
    if (!previewRows) return [];
    const fields = new Set();
    previewRows.filter(r => r.matchedTool && r.changes).forEach(r => Object.keys(r.changes).forEach(f => fields.add(f)));
    return [...fields].sort();
  }, [previewRows]);

  // Filter and sort logic
  let filtered = previewRows ? previewRows.map((row, idx) => ({ row, idx })).filter(({ row }) => {
    if (filterMode === 'new') return row.action !== 'ignore' && !row.matchedTool;
    if (filterMode === 'update') return row.action === 'update' && row.matchedTool;
    if (filterMode === 'missing_barcode') return !row.barcode || row.barcode.trim() === '';
    return row.action !== 'ignore';
  }) : [];

  // Filter by changed field
  if (filterChangedField !== 'all') {
    filtered = filtered.filter(({ row }) => row.changes && row.changes[filterChangedField]);
  }

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
               const missingBarcodeCount = previewRows.filter(r => !r.barcode || r.barcode.trim() === '').length;
               const matchedToolIds = new Set(previewRows.filter(r => r.matchedTool).map(r => r.matchedTool.id));
               const unmatchedExistingCount = tools.filter(t => !matchedToolIds.has(t.id)).length;

               return (
                 <div className="grid grid-cols-5 gap-3 mb-4">
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
                   <div className={`${missingBarcodeCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-3`}>
                     <div className={`text-2xl font-bold ${missingBarcodeCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{missingBarcodeCount}</div>
                     <div className={`text-sm ${missingBarcodeCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Saknar streckkod</div>
                   </div>
                   <div className={`${unmatchedExistingCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-3`}>
                     <div className={`text-2xl font-bold ${unmatchedExistingCount > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>{unmatchedExistingCount}</div>
                     <div className={`text-sm ${unmatchedExistingCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>Befintliga ej matchade</div>
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
                <div className="flex gap-3 items-end flex-wrap">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Välj fält</label>
                    <select
                      value={bulkEditField}
                      onChange={(e) => { setBulkEditField(e.target.value); setBulkEditValue(''); }}
                      className="border border-blue-300 rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="">- Välj fält -</option>
                      {['name', 'manufacturer', 'model_number', 'serial_number', 'tool_number', 'category', 'subcategory', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price', 'purchase_location', 'invoice_number', 'notes'].map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
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
                        const newRows = previewRows.map((row, idx) => {
                          if (!selectedRows.has(idx)) return row;
                          const updated = { ...row, [bulkEditField]: bulkEditValue };
                          return recomputeChanges(updated);
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
            <div className="flex gap-2 items-center mb-2 flex-wrap">
              <select
                value={filterMode}
                onChange={(e) => {
                  setFilterMode(e.target.value);
                  setFilterChangedField('all');
                  setSelectedRows(new Set());
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="all">Alla ({previewRows.filter(r => r.action !== 'ignore').length})</option>
                <option value="new">Nya maskiner ({previewRows.filter(r => r.action !== 'ignore' && !r.matchedTool).length})</option>
                <option value="update">Maskiner att uppdatera ({previewRows.filter(r => r.action === 'update' && r.matchedTool).length})</option>
                <option value="missing_barcode">Saknar streckkod ({previewRows.filter(r => !r.barcode || r.barcode.trim() === '').length})</option>
              </select>

              {allChangedFields.length > 0 && (
                <select
                  value={filterChangedField}
                  onChange={(e) => {
                    setFilterChangedField(e.target.value);
                    setSelectedRows(new Set());
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="all">Alla fält</option>
                  {allChangedFields.map(f => {
                    const count = previewRows.filter(r => r.changes && r.changes[f]).length;
                    return <option key={f} value={f}>{f} ({count})</option>;
                  })}
                </select>
              )}

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
            </div>

            <div className="sticky top-0 bg-gray-50 border border-gray-300 rounded-t-lg p-3 font-semibold text-sm text-gray-700 z-10">
              <div className="flex items-center gap-3">
                <div className="w-4">Val</div>
                <div className="w-24">Åtgärd</div>
                <button onClick={() => {
                  if (sortBy === 'barcode') setSortAsc(!sortAsc);
                  else { setSortBy('barcode'); setSortAsc(true); }
                }} className="text-left hover:text-blue-700 cursor-pointer flex items-center gap-1 flex-1">
                  Streckkod {sortBy === 'barcode' && (sortAsc ? '↑' : '↓')}
                </button>
                <button onClick={() => {
                  if (sortBy === 'name') setSortAsc(!sortAsc);
                  else { setSortBy('name'); setSortAsc(true); }
                }} className="text-left hover:text-blue-700 cursor-pointer flex items-center gap-1 flex-1">
                  Namn {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
                </button>
                <div className="w-20">Kategori</div>
                <div className="text-xs text-gray-500">Detaljer</div>
              </div>
            </div>

            <ToolImportPreviewTable
              filtered={filtered}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              expandedRowIdx={expandedRowIdx}
              setExpandedRowIdx={setExpandedRowIdx}
              previewRows={previewRows}
              setPreviewRows={setPreviewRows}
              setEditingRowIdx={setEditingRowIdx}
              setEditFormData={setEditFormData}
              availableCategories={availableCategories}
              locations={locations}
              selectedUpdates={selectedUpdates}
              setSelectedUpdates={setSelectedUpdates}
              tools={tools}
            />
          </div>

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
                          const baseRow = previewRows[editingRowIdx];
                          const newRows = previewRows.map((row, idx) => {
                            if (idx === editingRowIdx) return recomputeChanges({ ...row, ...editFormData });
                            if (row.matchedTool && row.name === baseRow.name && row.manufacturer === baseRow.manufacturer && row.model_number === baseRow.model_number) {
                              return recomputeChanges({ ...row, ...editFormData });
                            }
                            return row;
                          });
                          setPreviewRows(newRows);
                        } else {
                          const newRows = previewRows.map((row, idx) =>
                            idx === editingRowIdx ? recomputeChanges({ ...row, ...editFormData }) : row
                          );
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

          <div className="flex gap-3 justify-end mt-4">
            <Button 
              onClick={() => {
                const allRows = previewRows.map((r, idx) => ({
                  'namn': r.name,
                  'tillverkare': r.manufacturer,
                  'modell_nummer': r.model_number || '',
                  'serienummer': r.serial_number || '',
                  'verktygsnummer': r.tool_number || '',
                  'kategori': r.category,
                  'underkategori': r.subcategory || '',
                  'status': r.status,
                  'skick': r.condition,
                  'streckkod': r.barcode || '',
                  'inköpsdatum': r.purchase_date || '',
                  'inköpspris': r.purchase_price || '',
                  'inköpsplats': r.purchase_location || '',
                  'fakturanummer': r.invoice_number || '',
                  'servicekostnad': r.service_cost || '',
                  'plats': r.location_name || '',
                  'tilldelad_till': r.assigned_to_name || '',
                  'anteckningar': r.notes || '',
                  'åtgärd': r.action,
                  'matchad_befintlig': r.matchedTool ? 'Ja' : 'Nej',
                  'ändringar': r.changes ? Object.keys(r.changes).join('; ') : 'Ingen'
                }));
                const csv = [
                  Object.keys(allRows[0]),
                  ...allRows.map(r => Object.values(r).map(v => `"${v}"`))
                ].map(r => r.join(',')).join('\n');
                const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `tool_import_preview_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                URL.revokeObjectURL(link.href);
              }}
              variant="outline"
            >
              Ladda ned rapport
            </Button>
            <Button onClick={() => setPreviewRows(null)} variant="outline">Avbryt</Button>
            <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700">Importera</Button>
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
          <Button onClick={() => { setResults(null); setImportLogs([]); localStorage.removeItem('toolImportActiveState'); }} variant="outline" className="w-full">Rensa resultat</Button>
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
    </div>
  );
}