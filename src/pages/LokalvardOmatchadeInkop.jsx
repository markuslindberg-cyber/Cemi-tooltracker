import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function LokalvardOmatchadeInkop() {
  const [search, setSearch] = useState('');
  const [artikelSearch, setArtikelSearch] = useState({});
  const [selectedArtikel, setSelectedArtikel] = useState({});
  const queryClient = useQueryClient();

  const { data: inköp = [], isLoading: inkopLoading } = useQuery({
    queryKey: ['lokalvardInkop'],
    queryFn: () => base44.entities.LokalvardInköp.list('-created_date', 100000),
    staleTime: 30000,
  });

  const { data: artiklar = [], isLoading: artiklarLoading } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000),
    staleTime: 30000,
  });

  const articleIdSet = useMemo(() => new Set(artiklar.map(a => a.id)), [artiklar]);

  const omatchade = useMemo(() => {
    return inköp.filter(i => i.artikel_id && !articleIdSet.has(i.artikel_id));
  }, [inköp, articleIdSet]);

  // Group by unique artikel_id
  const grouped = useMemo(() => {
    const groups = {};
    omatchade.forEach(ink => {
      if (!groups[ink.artikel_id]) {
        groups[ink.artikel_id] = { records: [], priser: new Set() };
      }
      groups[ink.artikel_id].records.push(ink);
      if (ink.pris != null) groups[ink.artikel_id].priser.add(ink.pris);
    });
    return Object.entries(groups).map(([id, g]) => ({
      artikel_id: id,
      count: g.records.length,
      records: g.records,
      priser: [...g.priser],
      totalAntal: g.records.reduce((s, r) => s + (r.antal || 0), 0),
    }));
  }, [omatchade]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!search) return grouped;
    const s = search.toLowerCase();
    return grouped.filter(g =>
      g.artikel_id.toLowerCase().includes(s) ||
      g.priser.some(p => p.toString().includes(s))
    );
  }, [grouped, search]);

  // Filter articles for dropdown
  const filteredArtiklar = (groupId) => {
    const s = (artikelSearch[groupId] || '').toLowerCase();
    if (!s) return artiklar.slice(0, 20);
    return artiklar.filter(a =>
      a.benamning?.toLowerCase().includes(s) ||
      a.streckkod?.toLowerCase().includes(s) ||
      a.artikelnummer?.toLowerCase().includes(s)
    ).slice(0, 20);
  };

  const matchMutation = useMutation({
    mutationFn: async ({ records, newArtikelId }) => {
      for (const rec of records) {
        await base44.entities.LokalvardInköp.update(rec.id, { artikel_id: newArtikelId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokalvardInkop'] });
      toast.success('Inköp matchade!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (records) => {
      for (const rec of records) {
        await base44.entities.LokalvardInköp.delete(rec.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokalvardInkop'] });
      toast.success('Inköp raderade');
    },
  });

  if (inkopLoading || artiklarLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4 min-h-screen">
      <h1 className="text-2xl font-bold">🔗 Omatchade inköp</h1>
      <p className="text-sm text-gray-500">
        {omatchade.length} inköpsposter med ogiltiga artikel-ID:n, grupperade i {grouped.length} unika grupper.
        Välj rätt artikel för varje grupp eller radera dem.
      </p>

      <input
        type="text"
        placeholder="Sök på artikel-ID eller pris..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
      />

      <div className="space-y-3">
        {filteredGroups.map(group => (
          <div key={group.artikel_id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-mono text-gray-400 break-all">{group.artikel_id}</p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">{group.count}</span> inköpsposter •
                  Totalt <span className="font-semibold">{group.totalAntal}</span> st •
                  Pris: {group.priser.map(p => `${p} kr`).join(', ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {group.records.slice(0, 4).map(r => (
                    <span key={r.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {r.datum} – {r.antal} st × {r.pris} kr
                    </span>
                  ))}
                  {group.records.length > 4 && (
                    <span className="text-xs text-gray-400">+{group.records.length - 4} till</span>
                  )}
                </div>
              </div>
            </div>

            {/* Article picker */}
            <div className="mt-3 flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Koppla till artikel</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Sök artikel..."
                    value={artikelSearch[group.artikel_id] || ''}
                    onChange={e => setArtikelSearch(prev => ({ ...prev, [group.artikel_id]: e.target.value }))}
                    className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                {artikelSearch[group.artikel_id] && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                    {filteredArtiklar(group.artikel_id).map(a => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedArtikel(prev => ({ ...prev, [group.artikel_id]: a }));
                          setArtikelSearch(prev => ({ ...prev, [group.artikel_id]: '' }));
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium">{a.benamning}</span>
                        <span className="text-xs text-gray-400 font-mono ml-2">{a.streckkod}</span>
                      </button>
                    ))}
                    {filteredArtiklar(group.artikel_id).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">Inga artiklar hittades</p>
                    )}
                  </div>
                )}
                {selectedArtikel[group.artikel_id] && (
                  <div className="mt-1 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {selectedArtikel[group.artikel_id].benamning}
                    <button
                      onClick={() => setSelectedArtikel(prev => { const n = { ...prev }; delete n[group.artikel_id]; return n; })}
                      className="ml-auto text-gray-400 hover:text-gray-600 text-xs"
                    >✕</button>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                disabled={!selectedArtikel[group.artikel_id] || matchMutation.isPending}
                onClick={() => matchMutation.mutate({
                  records: group.records,
                  newArtikelId: selectedArtikel[group.artikel_id].id,
                })}
                className="bg-green-600 hover:bg-green-700"
              >
                {matchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Matcha ({group.count})
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`Radera ${group.count} inköpsposter?`)) {
                    deleteMutation.mutate(group.records);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                Radera
              </Button>
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {omatchade.length === 0 ? '🎉 Alla inköp är matchade!' : 'Inga träffar'}
          </div>
        )}
      </div>
    </div>
  );
}