import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Trash2, Search, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { toast } from 'sonner';
import UnmatchedRecordRow from '@/components/lokalvard/UnmatchedRecordRow';

export default function LokalvardOmatchadeInkop() {
  const [search, setSearch] = useState('');
  const [expandedBatches, setExpandedBatches] = useState({});
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

  // Group by batch: same created_date (truncated to minute) + same datum + same ordernummer
  const batches = useMemo(() => {
    const batchMap = {};
    omatchade.forEach(ink => {
      // Group by created_date (truncated to minute) to find items imported/created together
      const createdMinute = ink.created_date ? ink.created_date.substring(0, 16) : 'unknown';
      const batchKey = `${createdMinute}|${ink.datum || ''}|${ink.ordernummer || ''}`;

      if (!batchMap[batchKey]) {
        batchMap[batchKey] = {
          key: batchKey,
          createdDate: ink.created_date,
          datum: ink.datum,
          ordernummer: ink.ordernummer,
          records: [],
        };
      }
      batchMap[batchKey].records.push(ink);
    });

    return Object.values(batchMap)
      .sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''))
      .map(batch => ({
        ...batch,
        totalAntal: batch.records.reduce((s, r) => s + (r.antal || 0), 0),
        totalKostnad: batch.records.reduce((s, r) => s + (r.antal || 0) * (r.pris || 0), 0),
        uniqueArtikelIds: [...new Set(batch.records.map(r => r.artikel_id))],
      }));
  }, [omatchade]);

  // Filter
  const filteredBatches = useMemo(() => {
    if (!search) return batches;
    const s = search.toLowerCase();
    return batches.filter(b =>
      b.records.some(r =>
        (r.artikel_id || '').toLowerCase().includes(s) ||
        (r.ordernummer || '').toLowerCase().includes(s) ||
        (r.pris?.toString() || '').includes(s) ||
        (r.datum || '').includes(s)
      )
    );
  }, [batches, search]);

  const toggleBatch = (key) => {
    setExpandedBatches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const matchMutation = useMutation({
    mutationFn: async ({ records, newArtikelId, extraUpdates }) => {
      for (const rec of records) {
        await base44.entities.LokalvardInköp.update(rec.id, { artikel_id: newArtikelId, ...extraUpdates });
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

  const deleteAllMutation = useMutation({
    mutationFn: async (records) => {
      for (const rec of records) {
        await base44.entities.LokalvardInköp.delete(rec.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokalvardInkop'] });
      toast.success('Alla poster i gruppen raderade');
    },
  });

  if (inkopLoading || artiklarLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 min-h-screen">
      <h1 className="text-2xl font-bold">🔗 Omatchade inköp</h1>
      <p className="text-sm text-gray-500">
        {omatchade.length} inköpsposter med ogiltiga artikel-ID:n, grupperade i {batches.length} inköpstillfällen.
      </p>

      <input
        type="text"
        placeholder="Sök på artikel-ID, ordernummer, pris, datum..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
      />

      <div className="space-y-3">
        {filteredBatches.map(batch => {
          const isExpanded = expandedBatches[batch.key];
          return (
            <div key={batch.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Batch header */}
              <button
                onClick={() => toggleBatch(batch.key)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {batch.records.length} artikel{batch.records.length !== 1 ? 'er' : ''}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">
                      Inköpsdatum: <span className="font-medium">{batch.datum || '–'}</span>
                    </span>
                    {batch.ordernummer && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          Order: {batch.ordernummer}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>Totalt: {batch.totalAntal} st</span>
                    <span>{batch.totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
                    <span className="text-gray-400">Skapad: {batch.createdDate ? new Date(batch.createdDate).toLocaleString('sv-SE') : '–'}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                  disabled={deleteAllMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Radera alla ${batch.records.length} poster i denna grupp?`)) {
                      deleteAllMutation.mutate(batch.records);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Radera alla
                </Button>
              </button>

              {/* Expanded: show each record with matching */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="divide-y divide-gray-50">
                    {batch.records.map(record => (
                      <UnmatchedRecordRow
                        key={record.id}
                        record={record}
                        artiklar={artiklar}
                        onMatch={(newArtikelId, extraUpdates) => matchMutation.mutate({ records: [record], newArtikelId, extraUpdates })}
                        onDelete={() => {
                          if (confirm('Radera denna post?')) deleteMutation.mutate([record]);
                        }}
                        isMatching={matchMutation.isPending}
                        isDeleting={deleteMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredBatches.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {omatchade.length === 0 ? '🎉 Alla inköp är matchade!' : 'Inga träffar'}
          </div>
        )}
      </div>
    </div>
  );
}