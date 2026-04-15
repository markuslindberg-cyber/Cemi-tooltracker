import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar, ChevronDown, ChevronRight, X, Upload, FileDown, Download, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

export default function LokalvardUttag() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [editArticleForm, setEditArticleForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [searchBarcode, setSearchBarcode] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);

  const { data: uttag = [], isLoading: uttagLoading, refetch } = useQuery({
    queryKey: ['uttag'],
    queryFn: async () => {
      const [uttagData, checkoutData] = await Promise.all([
        base44.entities.Uttag.list('-datum', 10000).catch(() => []),
        base44.entities.LokalvardCheckout.list('-checked_out_date', 10000).catch(() => [])
      ]);
      
      const checkoutAsUttag = checkoutData.map(co => {
        const dateStr = co.checked_out_date || new Date().toISOString();
        return {
          id: co.id,
          datum: dateStr,
          personal_id: '',
          personal_namn: co.checked_out_by_name,
          kund_id: co.customer_id,
          kund_namn: co.customer_name,
          ordernummer: co.request_id,
          artiklar: co.checked_out_items.map(item => ({
            artikel_id: item.item_id,
            benamning: item.name,
            antal: item.scanned_quantity || item.quantity,
            pris_per_enhet: 0,
            total_pris: 0
          })),
          total_kostnad: 0,
          manad: dateStr.substring(0, 7)
        };
      });
      
      return [...uttagData, ...checkoutAsUttag].sort((a, b) => new Date(b.datum) - new Date(a.datum));
    },
    refetchInterval: 3000,
  });

  const { data: artiklar = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
  });

  const artikelMap = useMemo(() => {
    const map = {};
    artiklar.forEach(a => {
      map[a.id] = a;
      map[a.streckkod] = a;
      if (a.old_streckkod) {
        map[a.old_streckkod] = a;
      }
    });
    return map;
  }, [artiklar]);

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
  });

  const { data: kunder = [] } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list(null, 10000).catch(() => []),
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
      setSortOrder('asc');
    }
  };

  const availableMonths = useMemo(
    () => [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [uttag]
  );

  const personalMap = useMemo(() => {
    const map = {};
    personal.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [personal]);

  const personalNameToId = useMemo(() => {
    const map = {};
    personal.forEach(p => {
      map[p.name] = p.id;
    });
    return map;
  }, [personal]);

  const kundeNameToId = useMemo(() => {
    const map = {};
    kunder.forEach(k => {
      map[k.namn] = k.id;
    });
    return map;
  }, [kunder]);

  const availablePersonal = useMemo(
    () => {
      const seen = new Map();
      uttag.forEach(u => {
        if (u.personal_id && !seen.has(u.personal_id)) {
          seen.set(u.personal_id, personalMap[u.personal_id] || u.personal_namn);
        }
      });
      return Array.from(seen.entries());
    },
    [uttag, personalMap]
  );

  const [selectedPersonal, setSelectedPersonal] = useState([]);

  const filtered = uttag.filter(u => {
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(u.manad);
    const customerMatch = selectedCustomers.length === 0 || selectedCustomers.includes(u.kund_id);
    const personalMatch = selectedPersonal.length === 0 || selectedPersonal.includes(u.personal_id);
    const searchLower = searchBarcode.toLowerCase();
    const searchMatch = searchBarcode === '' || u.artiklar?.some(a => 
      a.benamning?.toLowerCase().includes(searchLower) ||
      a.artikel_id?.toLowerCase().includes(searchLower) || 
      artikelMap[a.artikel_id]?.streckkod?.includes(searchBarcode) ||
      artikelMap[a.artikel_id]?.old_streckkod?.includes(searchBarcode) ||
      artikelMap[a.artikel_id]?.benamning?.toLowerCase().includes(searchLower)
    );
    return monthMatch && customerMatch && personalMatch && searchMatch;
  });

  const sortField = (item) => {
    if (sortBy === 'personal_namn') return item.personal_namn;
    if (sortBy === 'kund_namn') return item.kund_namn;
    if (sortBy === 'total_kostnad') return item.total_kostnad;
    return item.datum;
  };

  const sorted = [...filtered].sort((a, b) => {
    let aVal = sortField(a);
    let bVal = sortField(b);
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUp className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-600 inline ml-1" />;
  };

  const handleDownloadTemplate = () => {
    const headers = ['datum', 'personal', 'kund', 'ordernummer', 'streckkod', 'antal', 'pris', 'månad'];
    const infoRows = [
      ['=== IMPORTMALL FÖR UTTAG ===', '', '', '', '', '', '', ''],
      headers,
      ['2026-01-15', 'Anna Andersson', 'Företag AB', 'ORD-001', '71617', '5', '49.99', '2026-01'],
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
            personal_id: personalNameToId[r.personal_namn] || '',
            personal_namn: r.personal_namn,
            kund_id: kundeNameToId[r.kund_namn] || '',
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
      ordernummer: item.ordernummer || '',
      total_kostnad: item.total_kostnad,
      antal: item.artiklar[0]?.antal || 0
    });
  };

  const handleEditArticle = (uttagId, artikel, articleIndex) => {
    setEditingArticleId(`${uttagId}-${articleIndex}`);
    setEditArticleForm({
      antal: artikel.antal,
      pris_per_enhet: artikel.pris_per_enhet
    });
  };

  const handleSaveArticle = (uttagId, articleIndex) => {
    const editingItem = uttag.find(u => u.id === uttagId);
    const updatedArtiklar = editingItem.artiklar.map((a, idx) => 
      idx === articleIndex 
        ? { ...a, antal: parseInt(editArticleForm.antal) || 0, pris_per_enhet: parseFloat(editArticleForm.pris_per_enhet) || 0, total_pris: (parseInt(editArticleForm.antal) || 0) * (parseFloat(editArticleForm.pris_per_enhet) || 0) }
        : a
    );
    const newTotal = updatedArtiklar.reduce((sum, a) => sum + a.total_pris, 0);
    updateMutation.mutate({
      id: uttagId,
      data: {
        artiklar: updatedArtiklar,
        total_kostnad: newTotal
      }
    });
    setEditingArticleId(null);
  };

  const handleCancelArticleEdit = () => {
    setEditingArticleId(null);
  };

  const groupArticles = (artiklar) => {
    const grouped = {};
    artiklar.forEach((artikel, idx) => {
      let name = artikel.benamning;
      let barcode = '';

      // Sök i lagerlistan efter artikel_id eller streckkod – prioritera artikel_id
      if (artikel.artikel_id) {
        const found = artikelMap[artikel.artikel_id];
        if (found) {
          name = found.benamning;
          barcode = found.streckkod;
        }
      }

      // Om fortfarande ingen namn hittad, försök streckkod
      if (!name && artikel.streckkod) {
        const foundByBarcode = artikelMap[artikel.streckkod];
        if (foundByBarcode) {
          name = foundByBarcode.benamning;
          barcode = foundByBarcode.streckkod;
        }
      }

      if (!name) name = artikel.artikel_id || artikel.streckkod || 'Okänd';
      if (!barcode) barcode = artikel.artikel_id || artikel.streckkod || '';

      const key = `${name}|${barcode}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...artikel, originalIndex: idx });
    });
    return Object.entries(grouped).map(([key, items]) => {
      const [name, barcode] = key.split('|');
      return {
        name,
        barcode,
        items,
        totalAntal: items.reduce((sum, item) => sum + item.antal, 0),
        totalPrice: items.reduce((sum, item) => sum + item.total_pris, 0)
      };
    });
  };

  const handleSaveEdit = () => {
    const editingItem = uttag.find(u => u.id === editingId);
    updateMutation.mutate({
      id: editingId,
      data: {
        personal_namn: editForm.personal_namn,
        kund_namn: editForm.kund_namn,
        ordernummer: editForm.ordernummer || null,
        total_kostnad: parseFloat(editForm.total_kostnad) || 0,
        artiklar: editingItem.artiklar.map((a, idx) => idx === 0 ? { ...a, antal: parseInt(editForm.antal) || 0 } : a)
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

  const unmatchedArticles = useMemo(() => {
    const unmatched = [];
    uttag.forEach(u => {
      u.artiklar?.forEach(artikel => {
        const found = artikelMap[artikel.artikel_id];
        if (!found) {
          const key = `${artikel.artikel_id}-${artikel.benamning}`;
          if (!unmatched.find(a => `${a.artikel_id}-${a.benamning}` === key)) {
            unmatched.push({
              artikel_id: artikel.artikel_id,
              benamning: artikel.benamning,
              count: uttag.reduce((sum, ut) => sum + (ut.artiklar?.filter(a => a.artikel_id === artikel.artikel_id).length || 0), 0)
            });
          }
        }
      });
    });
    return unmatched.sort((a, b) => b.count - a.count);
  }, [uttag, artikelMap]);

  if (uttagLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
       <div className="flex items-center justify-between flex-wrap gap-3">
         <h1 className="text-2xl font-bold">📋 Uttag – Lokalvård</h1>
         <div className="flex items-center gap-2 flex-wrap">
           <input
             type="text"
             placeholder="Sök streckkod eller namn..."
             value={searchBarcode}
             onChange={(e) => setSearchBarcode(e.target.value)}
             className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
           />
           {(selectedMonths.length > 0 || selectedCustomers.length > 0 || selectedPersonal.length > 0 || searchBarcode !== '') && (
               <Button 
                 size="sm" 
                 variant="outline" 
                 onClick={() => { setSelectedMonths([]); setSelectedCustomers([]); setSelectedPersonal([]); setSearchBarcode(''); }}
                 className="gap-1 text-xs"
               >
                 <RotateCcw className="w-3 h-3" /> Rensa alla
               </Button>
             )}
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

          {/* Personal filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase">Personal</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600">
                  {selectedPersonal.length === 0 ? 'Alla' : `${selectedPersonal.length}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availablePersonal.map(([pid, namn]) => (
                    <label key={pid} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedPersonal.includes(pid)} onCheckedChange={(checked) => setSelectedPersonal(prev => checked ? [...prev, pid] : prev.filter(x => x !== pid))} />
                      <span className="text-sm">{namn}</span>
                    </label>
                  ))}
                </div>
                {selectedPersonal.length > 0 && (
                  <button onClick={() => setSelectedPersonal([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
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
          {unmatchedArticles.length > 0 && !showUnmatched && (
            <Button size="sm" onClick={() => setShowUnmatched(true)} className="bg-yellow-600 hover:bg-yellow-700">
              ⚠️ Omatchade ({unmatchedArticles.length})
            </Button>
          )}
        </div>
      </div>

      {showUnmatched ? (
        <div>
          <Button size="sm" onClick={() => setShowUnmatched(false)} variant="outline">
            ← Tillbaka till uttag
          </Button>
        </div>
      ) : (
        <div>
          {sorted.length > 0 ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Totalt {sorted.length} uttag</span>
                <span className="text-xl font-bold text-blue-900">{total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-6"></th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => handleSort('datum')}>
                        Datum <SortIcon col="datum" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => handleSort('kund_namn')}>
                        Kund <SortIcon col="kund_namn" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => handleSort('personal_namn')}>
                        Personal <SortIcon col="personal_namn" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Ordernummer</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => handleSort('total_kostnad')}>
                        Kostnad <SortIcon col="total_kostnad" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((u) => {
                       const isExpanded = expandedRows[u.id];
                       const datumStr = u.datum ? u.datum.split('T')[0] : '';
                       const tidStr = u.datum?.split('T')[1]?.slice(0, 5) || '';
                       return [
                             <tr
                              key={u.id}
                              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleRow(u.id)}
                            >
                             <td className="pl-3 py-3">
                               <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                             </td>
                             <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{datumStr}</td>
                             <td className="px-4 py-3 text-gray-900 font-medium">{u.kund_namn}</td>
                             <td className="px-4 py-3 text-gray-700">{u.personal_namn}</td>
                             <td className="px-4 py-3 text-gray-500 text-xs">{u.ordernummer || '–'}</td>
                             <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                               {u.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                             </td>
                           </tr>,
                           isExpanded && (
                             <tr key={`${u.id}-detail`} className="bg-gray-50">
                               <td colSpan={6} className="px-6 py-3">
                                 {(!u.artiklar || u.artiklar.length === 0) ? (
                                   <div className="text-sm text-gray-500">Inga artiklar</div>
                                 ) : (
                                   <div className="space-y-2">
                                     {groupArticles(u.artiklar).map((group) => (
                                        <div key={`${group.name}-${group.barcode}`} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between gap-3">
                                          <div className="flex-1 cursor-pointer hover:opacity-70" onClick={() => {
                                            const artikel = artikelMap[group.barcode] || artikelMap[u.artiklar.find(a => a.benamning === group.name)?.artikel_id];
                                            if (artikel) navigate(`/Lokalvard/Artikel/${artikel.artikelnummer}`);
                                          }}>
                                            <div className="font-medium text-gray-900">{group.name}</div>
                                          </div>
                                         <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                           <div className="text-right">
                                             <div className="text-sm font-medium text-gray-900">{group.totalAntal} st</div>
                                             <div className="text-xs text-gray-500">{group.totalPrice.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</div>
                                           </div>
                                           {editingArticleId === `${u.id}-${group.items[0].originalIndex}` ? (
                                             <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                               <span className="text-xs text-gray-700">{group.name}</span>
                                               <input type="number" value={editArticleForm.antal} onChange={(e) => setEditArticleForm({...editArticleForm, antal: e.target.value})} className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs" />
                                               <input type="number" value={editArticleForm.pris_per_enhet} onChange={(e) => setEditArticleForm({...editArticleForm, pris_per_enhet: e.target.value})} className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs" />
                                               <button onClick={() => handleSaveArticle(u.id, group.items[0].originalIndex)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">Spara</button>
                                               <button onClick={handleCancelArticleEdit} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs font-medium hover:bg-gray-500">Avbryt</button>
                                             </div>
                                           ) : (
                                             <button onClick={() => handleEditArticle(u.id, group.items[0], group.items[0].originalIndex)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">Redigera</button>
                                           )}
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 )}
                               </td>
                             </tr>
                           )
                        ].filter(Boolean);
                       })}
                          </tbody>
                </table>
              </div>
              </div>
              ) : (
              <div className="text-center py-8 text-gray-500">Inget uttag för denna period</div>
              )}
              </div>
              )}

      {unmatchedArticles.length > 0 && showUnmatched && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-yellow-900">⚠️ Omatchade artiklar ({unmatchedArticles.length})</h2>
            <Button size="sm" onClick={() => setShowUnmatched(false)} variant="outline">
              Stäng
            </Button>
          </div>
          <p className="text-sm text-yellow-800 mb-3">Dessa streckkoder/artiklar från uttag matchar inte artiklar i lagerlistan:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-yellow-100 border-b">
                  <th className="px-4 py-2 text-left font-semibold text-yellow-900">Streckkod/ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-yellow-900">Namn</th>
                  <th className="px-4 py-2 text-right font-semibold text-yellow-900">Antal gånger använd</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unmatchedArticles.map((artikel) => (
                  <tr key={`${artikel.artikel_id}-${artikel.benamning}`} className="hover:bg-yellow-100">
                    <td className="px-4 py-2 font-mono text-yellow-900">{artikel.artikel_id}</td>
                    <td className="px-4 py-2 text-yellow-900">{artikel.benamning || '–'}</td>
                    <td className="px-4 py-2 text-right text-yellow-900 font-semibold">{artikel.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}