import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MaterialFormModal from '@/components/materialbank/MaterialFormModal';
import MaterialUttagModal from '@/components/materialbank/MaterialUttagModal';
import { Plus, Search, Boxes, Package, Trash2, RotateCcw, ScanLine } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUS_LABELS = { i_lager: 'I lager', reserverad: 'Reserverad', såld: 'Såld' };
const STATUS_COLORS = { i_lager: 'bg-emerald-100 text-emerald-700', reserverad: 'bg-amber-100 text-amber-700', såld: 'bg-gray-100 text-gray-600' };
const SYFTE_LABELS = { internt: 'Internt', till_forsaljning: 'Till försäljning' };
const SYFTE_COLORS = { internt: 'bg-amber-100 text-amber-800 border-amber-200', till_forsaljning: 'bg-blue-100 text-blue-800 border-blue-200' };

export default function Materialbanken() {
  const [showForm, setShowForm] = useState(false);
  const [showUttag, setShowUttag] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');
  const [filterSyfte, setFilterSyfte] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materialLager'],
    queryFn: () => base44.entities.MaterialLager.filter({ is_deleted: false }),
    staleTime: 0,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editItem?.id) {
        return base44.entities.MaterialLager.update(editItem.id, data);
      }
      return base44.entities.MaterialLager.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialLager'] });
      toast({ title: editItem ? 'Material uppdaterat' : 'Material registrerat' });
      setEditItem(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaterialLager.update(id, { is_deleted: true, deleted_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materialLager'] });
      toast({ title: 'Material flyttat till papperskorgen' });
    },
  });

  const kategorier = useMemo(() => [...new Set(materials.map(m => m.kategori).filter(Boolean))].sort(), [materials]);

  const filtered = useMemo(() => {
    return materials.filter(m => {
      if (filterKategori !== 'all' && m.kategori !== filterKategori) return false;
      if (filterSyfte !== 'all' && m.syfte !== filterSyfte) return false;
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return (m.benamning || '').toLowerCase().includes(s)
          || (m.streckkod || '').toLowerCase().includes(s)
          || (m.artikelnummer || '').toLowerCase().includes(s)
          || (m.tillverkare || '').toLowerCase().includes(s)
          || (m.kund_namn || '').toLowerCase().includes(s)
          || (m.ordernummer || '').toLowerCase().includes(s)
          || (m.kategori || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [materials, search, filterKategori, filterSyfte, filterStatus]);

  const totalInkopsvarde = filtered.reduce((s, m) => s + (m.inkopspris || 0) * (m.antal || 0), 0);

  const getForsaljningspris = (m) => m.forsaljningspris_manuell ?? (m.inkopspris || 0) * 1.3;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Boxes className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Materialbanken</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Överblivet material från jobb</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowUttag(true)} variant="outline" className="border-[#8B1E1E] text-[#8B1E1E] hover:bg-[#8B1E1E]/10">
              <ScanLine className="w-4 h-4 mr-2" /> Uttag
            </Button>
            <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25">
              <Plus className="w-4 h-4 mr-2" /> Registrera material
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Artiklar i lager</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{materials.filter(m => m.status === 'i_lager').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Inköpsvärde (filtrerat)</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalInkopsvarde.toLocaleString('sv-SE')} kr</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Till försäljning</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{materials.filter(m => m.syfte === 'till_forsaljning' && m.status !== 'såld').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Kategorier</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{kategorier.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök benämning, artikel, kund..." className="pl-10" />
          </div>
          <Select value={filterKategori} onValueChange={setFilterKategori}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kategorier</SelectItem>
              {kategorier.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSyfte} onValueChange={setFilterSyfte}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Syfte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla syften</SelectItem>
              <SelectItem value="internt">Internt</SelectItem>
              <SelectItem value="till_forsaljning">Till försäljning</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="i_lager">I lager</SelectItem>
              <SelectItem value="reserverad">Reserverad</SelectItem>
              <SelectItem value="såld">Såld</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table / List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <Boxes className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Inga material hittades</p>
            <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
              <Plus className="w-4 h-4 mr-2" /> Registrera material
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Material</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Plats</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Antal</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Inköpspris</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Försäljn.pris</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Syfte</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map(m => (
                    <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${m.syfte === 'internt' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-blue-400'}`} onClick={() => { setEditItem(m); setShowForm(true); }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {m.image_url ? (
                            <img src={m.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{m.benamning}</p>
                            <p className="text-xs text-gray-400 truncate">{m.tillverkare}{m.matt ? ` · ${m.matt}` : ''}{m.kund_namn ? ` · ${m.kund_namn}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.kategori}{m.underkategori ? ` / ${m.underkategori}` : ''}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.location_name || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{m.antal} {m.enhet || 'st'}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{(m.inkopspris || 0).toLocaleString('sv-SE')} kr</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{getForsaljningspris(m).toLocaleString('sv-SE')} kr</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${SYFTE_COLORS[m.syfte] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {SYFTE_LABELS[m.syfte] || m.syfte}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[m.status] || m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => deleteMutation.mutate(m.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {filtered.map(m => (
                <div key={m.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 active:scale-[0.99] transition-transform ${m.syfte === 'internt' ? 'border-l-4 border-l-amber-400 border-gray-100 dark:border-gray-800' : 'border-l-4 border-l-blue-400 border-gray-100 dark:border-gray-800'}`} onClick={() => { setEditItem(m); setShowForm(true); }}>
                  <div className="flex items-start gap-3">
                    {m.image_url ? (
                      <img src={m.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{m.benamning}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.kategori}{m.location_name ? ` · ${m.location_name}` : ''}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${SYFTE_COLORS[m.syfte] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {SYFTE_LABELS[m.syfte]}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{m.antal} {m.enhet || 'st'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{(m.inkopspris || 0).toLocaleString('sv-SE')} kr/st</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <MaterialFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        material={editItem}
        locations={locations}
        onSubmit={(data) => saveMutation.mutateAsync(data)}
      />

      <MaterialUttagModal
        isOpen={showUttag}
        onClose={() => setShowUttag(false)}
        materials={materials}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['materialLager'] })}
      />
    </div>
  );
}