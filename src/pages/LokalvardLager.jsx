import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Edit2, Upload, FileDown, ArrowUp, ArrowDown, AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LokalvardLager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('benamning');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [filterTyp, setFilterTyp] = useState('alla');

  const { data: artiklar = [], isLoading: artiklarLoading } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).catch(() => []),
  });

  const { data: uttag = [], isLoading: uttagLoading } = useQuery({
    queryKey: ['uttag'],
    queryFn: () => base44.entities.Uttag.list(null, 10000).catch(() => []),
  });

  const calculateSaldo = (artikel) => {
    const totalUttaget = uttag.reduce((sum, u) => {
      const artiklarMatch = u.artiklar.filter(a => a.benamning === artikel.benamning);
      return sum + artiklarMatch.reduce((s, a) => s + (a.antal || 0), 0);
    }, 0);
    return artikel.antal_inkopta - totalUttaget;
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LokalvardsArtikel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LokalvardsArtikel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
    },
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const filtered = artiklar.filter(a => {
    const matchSearch = a.benamning.toLowerCase().includes(search.toLowerCase()) || a.streckkod?.includes(search);
    if (!matchSearch) return false;
    if (filterTyp === 'lowStock') return a.current_quantity < (a.lagertroskelvarde || 10);
    if (filterTyp === 'empty') return a.current_quantity === 0;
    if (filterTyp === 'utgaende') return !!a.utgaende;
    return true;
  });

  const grouped = {};
  filtered.forEach(a => {
    const key = a.artikelnummer;
    if (!grouped[key]) {
      grouped[key] = { ...a, variants: [] };
    }
    grouped[key].variants.push(a);
  });

  const sorted = Object.values(grouped).sort((a, b) => {
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
    const headers = ['benamning', 'artikelnummer', 'streckkod', 'pris', 'inkopsdatum', 'antal_inkopta', 'lagertroskelvarde', 'subcategory', 'current_quantity', 'utgaende'];
    const infoRows = [
      ['=== IMPORTMALL FÖR LOKALVÅRDSARTIKLAR ===', '', '', '', '', '', '', '', '', ''],
      headers,
      ['Rengöringsduk', 'ART-001', '1234567890', '49.99', '2026-01-01', '100', '20', 'Textilier', '45', 'false'],
    ];
    const csv = [
      ...infoRows.map(r => r.map(c => `"${c}"`).join(',')),
      ...Array(19).fill(Array(10).fill('').map(() => ''))
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_lager_mall.csv';
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
            benamning: { type: 'string' },
            artikelnummer: { type: 'string' },
            streckkod: { type: 'string' },
            pris: { type: 'number' },
            inkopsdatum: { type: 'string' },
            antal_inkopta: { type: 'number' },
            lagertroskelvarde: { type: 'number' },
            subcategory: { type: 'string' },
            current_quantity: { type: 'number' },
            utgaende: { type: 'boolean' }
          }
        }
      });
      if (result.status === 'success' && Array.isArray(result.output)) {
        const valid = result.output.filter(r => r.benamning && r.artikelnummer && r.pris && r.antal_inkopta);
        if (valid.length > 0) {
          await base44.entities.LokalvardsArtikel.bulkCreate(valid);
          queryClient.invalidateQueries(['lokalvardsArtiklar']);
          alert(`${valid.length} artiklar importerade!`);
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

  const handleEditClick = (artikel) => {
    setEditingId(artikel.id);
    setEditForm({
      benamning: artikel.benamning,
      pris: artikel.pris,
      current_quantity: artikel.current_quantity,
      lagertroskelvarde: artikel.lagertroskelvarde,
      utgaende: !!artikel.utgaende,
    });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: editingId,
      data: {
        benamning: editForm.benamning,
        pris: parseFloat(editForm.pris),
        current_quantity: parseInt(editForm.current_quantity),
        lagertroskelvarde: parseInt(editForm.lagertroskelvarde),
        utgaende: editForm.utgaende,
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const tomma = artiklar.filter(a => calculateSaldo(a) === 0).length;
  const lågtSaldo = artiklar.filter(a => {
    const saldo = calculateSaldo(a);
    return saldo > 0 && saldo < (a.lagertroskelvarde || 10);
  }).length;
  const totaltVärde = artiklar.reduce((sum, a) => sum + (calculateSaldo(a) * a.pris), 0);
  const filteredTotal = sorted.reduce((sum, a) => sum + (calculateSaldo(a) * a.pris), 0);

  if (artiklarLoading || uttagLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📦 Lager – Lokalvård</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Sök artikel eller streckkod..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400 w-52"
          />
          <Button size="sm" onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-1" /> Mall
          </Button>
          <Button size="sm" onClick={handleImportClick} disabled={uploading} className="bg-green-600 hover:bg-green-700">
            <Upload className="w-4 h-4 mr-1" /> Importera
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <Button size="sm" onClick={() => window.location.href = '/Lokalvard/Lager?new=true'} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            <Plus className="w-4 h-4 mr-1" /> Ny artikel
          </Button>
        </div>
      </div>

      {/* Totalt lagervärde */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-blue-700 font-medium">Totalt lagervärde ({sorted.length} artiklar)</span>
        <span className="text-xl font-bold text-blue-900">{filteredTotal.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
      </div>

      {/* Filterflikar */}
       <div className="flex gap-1 flex-wrap items-center">
         {[
           { key: 'alla', label: 'Alla artiklar' },
           { key: 'empty', label: `Slut i lager (${tomma})` },
           { key: 'lowStock', label: `Lågt lager (${lågtSaldo})` },
           { key: 'utgaende', label: 'Utgående' }
         ].map(({ key, label }) => (
           <button
             key={key}
             onClick={() => setFilterTyp(key)}
             className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
               filterTyp === key
                 ? 'bg-gray-800 text-white'
                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
             }`}
           >
             {label}
           </button>
         ))}
         {filterTyp !== 'alla' && (
           <Button 
             size="sm" 
             variant="outline" 
             onClick={() => setFilterTyp('alla')}
             className="gap-1 text-xs ml-auto"
           >
             <RotateCcw className="w-3 h-3" /> Rensa
           </Button>
         )}
       </div>

      {/* Status badges */}
      {(tomma > 0 || lågtSaldo > 0) && (
        <div className="flex gap-2 flex-wrap">
          {tomma > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{tomma} artiklar slut</span>
            </div>
          )}
          {lågtSaldo > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{lågtSaldo} lågt lager</span>
            </div>
          )}
        </div>
      )}

      {/* Tabell */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('benamning')}>
                  <div className="flex items-center gap-2">
                    Artikel
                    {sortBy === 'benamning' && (sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('streckkod')}>
                  <div className="flex items-center gap-1">
                    Streckkod
                    {sortBy === 'streckkod' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pris')}>
                  <div className="flex items-center justify-end gap-1">
                    Pris
                    {sortBy === 'pris' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('antal_inkopta')}>
                  <div className="flex items-center justify-end gap-1">
                    Inköpt
                    {sortBy === 'antal_inkopta' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('current_quantity')}>
                  <div className="flex items-center justify-end gap-1">
                    Saldo
                    {sortBy === 'current_quantity' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lagertroskelvarde')}>
                  <div className="flex items-center justify-end gap-1">
                    Tröskelvärde
                    {sortBy === 'lagertroskelvarde' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y">
               {sorted.map((gruppe) => {
                 const artikel = gruppe.variants[0];
                 const totalSaldo = gruppe.variants.reduce((sum, a) => sum + calculateSaldo(a), 0);
                 let saldoColor = 'text-gray-900';
                 let saldoBg = '';
                 if (totalSaldo === 0) {
                   saldoColor = 'text-red-600 font-semibold';
                   saldoBg = 'bg-red-50';
                 } else if (totalSaldo < (artikel.lagertroskelvarde || 10)) {
                   saldoColor = 'text-yellow-600 font-semibold';
                   saldoBg = 'bg-yellow-50';
                 }

                 return (
                    <React.Fragment key={artikel.id}>
                      <tr className={`${saldoBg} transition-colors`}>
                     {editingId === artikel.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.benamning}
                            onChange={(e) => setEditForm({ ...editForm, benamning: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{artikel.streckkod}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.pris}
                            onChange={(e) => setEditForm({ ...editForm, pris: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">{artikel.antal_inkopta}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editForm.current_quantity}
                            onChange={(e) => setEditForm({ ...editForm, current_quantity: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                           <input
                             type="number"
                             value={editForm.lagertroskelvarde}
                             onChange={(e) => setEditForm({ ...editForm, lagertroskelvarde: e.target.value })}
                             className="px-2 py-1 border border-gray-300 rounded w-full text-right"
                           />
                         </td>
                         <td className="px-4 py-3">
                           <label className="flex items-center gap-2 cursor-pointer">
                             <Checkbox checked={editForm.utgaende} onCheckedChange={(checked) => setEditForm({ ...editForm, utgaende: !!checked })} />
                             <span className="text-xs text-gray-600">Utgående</span>
                           </label>
                         </td>
                         <td className="px-4 py-3">
                           <div className="flex items-center gap-2">
                             <button
                               onClick={handleSaveEdit}
                               className="text-green-600 hover:bg-green-50 p-1 rounded font-semibold"
                               title="Spara"
                             >
                               ✓
                             </button>
                             <button
                               onClick={handleCancelEdit}
                               className="text-red-600 hover:bg-red-50 p-1 rounded font-semibold"
                               title="Avbryt"
                             >
                               ✕
                             </button>
                           </div>
                         </td>
                      </>
                    ) : (
                       <>
                         <td className="px-4 py-3">
                           <button
                             onClick={() => navigate(`/Lokalvard/Artikel/${artikel.artikelnummer}`)}
                             className="font-medium text-blue-600 hover:underline text-left"
                           >
                             <div className="flex items-center gap-2">
                               <span>{artikel.benamning}</span>
                               {artikel.subcategory && <span className="text-sm text-gray-500">— {artikel.subcategory}</span>}
                             </div>
                           </button>
                         </td>
                         <td className="px-4 py-3 text-sm text-gray-600">{artikel.streckkod}</td>
                         <td className="px-4 py-3 text-right">{artikel.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                         <td className="px-4 py-3 text-right">{gruppe.variants.reduce((sum, a) => sum + a.antal_inkopta, 0)}</td>
                         <td className={`px-4 py-3 text-right ${saldoColor}`}>{totalSaldo}</td>
                         <td className="px-4 py-3 text-right text-sm text-gray-600">{artikel.lagertroskelvarde}</td>
                         <td className="px-4 py-3">
                           {artikel.utgaende ? (
                             <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Utgående</span>
                           ) : (
                             <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Aktiv</span>
                           )}
                         </td>
                         <td className="px-4 py-3">
                           <button
                             onClick={(e) => { e.stopPropagation(); handleEditClick(artikel); }}
                             className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                             title="Redigera"
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                         </td>
                      </>
                      )}
                      </tr>
                      {gruppe.variants.length > 1 && !editingId && gruppe.variants.slice(1).map(variant => {
                      const variantSaldo = calculateSaldo(variant);
                      let variantColor = 'text-gray-700';
                      if (variantSaldo === 0) variantColor = 'text-red-600 font-semibold';
                      else if (variantSaldo < (variant.lagertroskelvarde || 10)) variantColor = 'text-yellow-600 font-semibold';

                      return (
                      <tr key={variant.id} className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="px-4 py-2 text-sm text-gray-600">
                          <span className="ml-4">→ {variant.subcategory || 'Variant'}</span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{variant.streckkod}</td>
                        <td className="px-4 py-2 text-right text-sm">{variant.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                        <td className="px-4 py-2 text-right text-sm">{variant.antal_inkopta}</td>
                        <td className={`px-4 py-2 text-right text-sm ${variantColor}`}>{variantSaldo}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-600">{variant.lagertroskelvarde}</td>
                        <td className="px-4 py-2">
                          {variant.utgaende ? (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Utgående</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Aktiv</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditClick(variant); }}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                            title="Redigera"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      );
                      })}
                      </React.Fragment>
                      );
                      })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}