import React, { useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar, ChevronDown, X, Upload, FileDown, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LokalvardUttag() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);

  const { data: uttag = [], isLoading } = useQuery({
    queryKey: ['uttag'],
    queryFn: () => base44.entities.Uttag.list('-datum', 10000).catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Uttag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['uttag']);
      setEditingId(null);
    },
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const availableMonths = useMemo(
    () => [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [uttag]
  );

  const filtered = uttag.filter(u => 
    (selectedMonths.length === 0 || selectedMonths.includes(u.manad)) &&
    (selectedCustomers.length === 0 || selectedCustomers.includes(u.kund_id))
  );

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDownloadTemplate = () => {
    const headers = ['datum', 'personal_namn', 'kund_namn', 'ordernummer', 'artikel_benamning', 'antal', 'pris_per_enhet', 'manad'];
    const infoRows = [
      ['=== IMPORTMALL FÖR UTTAG ===', '', '', '', '', '', '', ''],
      headers,
      ['2026-01-15', 'Anna Andersson', 'Företag AB', 'ORD-001', 'Rengöringsduk', '5', '49.99', '2026-01'],
    ];
    const csv = [...infoRows.map(r => r.map(c => `"${c}"`).join(',')), ...Array(19).fill(Array(8).fill('')).map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_uttag_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            datum: { type: 'string' },
            personal_namn: { type: 'string' },
            kund_namn: { type: 'string' },
            ordernummer: { type: 'string' },
            artikel_benamning: { type: 'string' },
            antal: { type: 'number' },
            pris_per_enhet: { type: 'number' },
            manad: { type: 'string' }
          }
        }
      });
      if (result.status === 'success' && Array.isArray(result.output)) {
        const valid = result.output.filter(r => r.datum && r.personal_namn && r.kund_namn && r.artikel_benamning && r.antal && r.pris_per_enhet);
        if (valid.length > 0) {
          await base44.entities.Uttag.bulkCreate(valid.map(r => ({
            datum: r.datum,
            personal_id: '',
            personal_namn: r.personal_namn,
            kund_id: '',
            kund_namn: r.kund_namn,
            ordernummer: r.ordernummer || null,
            artiklar: [{
              artikel_id: '',
              benamning: r.artikel_benamning,
              antal: r.antal,
              pris_per_enhet: r.pris_per_enhet,
              total_pris: r.antal * r.pris_per_enhet,
            }],
            total_kostnad: r.antal * r.pris_per_enhet,
            manad: r.manad,
          })));
          queryClient.invalidateQueries(['uttag']);
          alert(`${valid.length} uttag importerade!`);
        } else {
          alert('Inga giltiga rader hittades.');
        }
      } else {
        alert('Importfel: ' + (result.details || 'Okänt fel'));
      }
    } catch (err) {
      alert('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm({
      personal_namn: item.personal_namn,
      kund_namn: item.kund_namn,
      ordernummer: item.ordernummer || ''
    });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: editingId,
      data: {
        personal_namn: editForm.personal_namn,
        kund_namn: editForm.kund_namn,
        ordernummer: editForm.ordernummer || null,
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleExport = () => {
    const csv = [
      'Datum,Personal,Kund,Artikel,Antal,Pris,Ordernummer',
      ...sorted.map(u => `${u.datum},${u.personal_namn},${u.kund_namn},"${u.artiklar[0]?.benamning || ''}",${u.artiklar[0]?.antal || 0},${u.total_kostnad.toFixed(2)},${u.ordernummer || ''}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uttag_${selectedMonths.length > 0 ? selectedMonths.join('_') : 'alla'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = sorted.reduce((sum, u) => sum + u.total_kostnad, 0);
  const customers = [...new Set(uttag.map(u => u.kund_id).filter(Boolean))];

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📋 Uttag – Lokalvård</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Månad filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Månad</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600">
                  {selectedMonths.length === 0 ? 'Alla' : `${selectedMonths.length}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableMonths.map(m => (
                    <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedMonths.includes(m)} onCheckedChange={(checked) => setSelectedMonths(prev => checked ? [...prev, m] : prev.filter(x => x !== m))} />
                      <span className="text-sm">{m}</span>
                    </label>
                  ))}
                </div>
                {selectedMonths.length > 0 && (
                  <button onClick={() => setSelectedMonths([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Kund filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase">Kund</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600">
                  {selectedCustomers.length === 0 ? 'Alla' : `${selectedCustomers.length}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {customers.map(cid => {
                    const cust = uttag.find(u => u.kund_id === cid);
                    return (
                      <label key={cid} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <Checkbox checked={selectedCustomers.includes(cid)} onCheckedChange={(checked) => setSelectedCustomers(prev => checked ? [...prev, cid] : prev.filter(x => x !== cid))} />
                        <span className="text-sm">{cust?.kund_namn}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedCustomers.length > 0 && (
                  <button onClick={() => setSelectedCustomers([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <Button size="sm" onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-1" /> Mall
          </Button>
          <Button size="sm" onClick={handleImportClick} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-1" /> Importera
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          {sorted.length > 0 && (
            <Button size="sm" onClick={handleExport} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          )}
        </div>
      </div>

      {sorted.length > 0 ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">Totalt {sorted.length} uttag</span>
            <span className="text-xl font-bold text-blue-900">{total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('datum')}>
                      <div className="flex items-center gap-1">
                        Datum
                        {sortBy === 'datum' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('personal_namn')}>
                      <div className="flex items-center gap-1">
                        Personal
                        {sortBy === 'personal_namn' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('kund_namn')}>
                      <div className="flex items-center gap-1">
                        Kund
                        {sortBy === 'kund_namn' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">Artikel</th>
                    <th className="px-3 py-2 text-right font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_kostnad')}>
                      <div className="flex items-center justify-end gap-1">
                        Totalt
                        {sortBy === 'total_kostnad' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">Ordernummer</th>
                    <th className="px-3 py-2 text-left font-semibold">Åtgärd</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map(u => {
                    const isEditing = editingId === u.id;
                    return (
                      <tr key={u.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap">{u.datum}</td>
                        <td className="px-3 py-2">{isEditing ? <input type="text" value={editForm.personal_namn} onChange={(e) => setEditForm({...editForm, personal_namn: e.target.value})} className="px-2 py-1 border border-gray-300 rounded w-32" /> : u.personal_namn}</td>
                        <td className="px-3 py-2">{isEditing ? <input type="text" value={editForm.kund_namn} onChange={(e) => setEditForm({...editForm, kund_namn: e.target.value})} className="px-2 py-1 border border-gray-300 rounded w-32" /> : u.kund_namn}</td>
                        <td className="px-3 py-2">{u.artiklar[0]?.benamning} {u.artiklar[0]?.subcategory && `(${u.artiklar[0].subcategory})`}</td>
                        <td className="px-3 py-2 text-right font-semibold">{u.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                        <td className="px-3 py-2">{isEditing ? <input type="text" value={editForm.ordernummer} onChange={(e) => setEditForm({...editForm, ordernummer: e.target.value})} className="px-2 py-1 border border-gray-300 rounded w-24" /> : (u.ordernummer || '-')}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button onClick={handleSaveEdit} className="text-green-600 font-semibold hover:bg-green-50 px-2 py-1 rounded">✓</button>
                              <button onClick={handleCancelEdit} className="text-red-600 font-semibold hover:bg-red-50 px-2 py-1 rounded">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => handleEditClick(u)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs">Redigera</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">Inget uttag för denna period</div>
      )}
    </div>
  );
}