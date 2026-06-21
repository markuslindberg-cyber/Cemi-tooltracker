import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ClipboardList, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment';

const TYP_LABELS = { uttag: 'Uttag', justering: 'Justering', inkomst: 'Inkomst' };
const TYP_COLORS = { uttag: 'bg-red-100 text-red-700', justering: 'bg-amber-100 text-amber-700', inkomst: 'bg-green-100 text-green-700' };

export default function MaterialUttagHistorik() {
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');

  const { data: uttag = [], isLoading } = useQuery({
    queryKey: ['allMaterialUttag'],
    queryFn: () => base44.entities.MaterialUttag.list('-datum', 500),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = uttag;
    if (q) {
      list = list.filter(u =>
        (u.material_benamning || '').toLowerCase().includes(q) ||
        (u.kund_namn || '').toLowerCase().includes(q) ||
        (u.ordernummer || '').toLowerCase().includes(q) ||
        (u.uttagen_av_namn || '').toLowerCase().includes(q) ||
        (u.material_artikelnummer || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const diff = new Date(b.datum) - new Date(a.datum);
      return sortDir === 'desc' ? diff : -diff;
    });
  }, [uttag, search, sortDir]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B1E1E] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Materialuttag</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Historik över alla uttag från materialbanken</p>
        </div>

        {/* Search & sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök material, kund, order, person..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir === 'desc' ? 'Nyast först' : 'Äldst först'}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uttag.length}</p>
            <p className="text-xs text-gray-500">Totalt uttag</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {new Set(uttag.map(u => u.kund_namn)).size}
            </p>
            <p className="text-xs text-gray-500">Unika kunder</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {new Set(uttag.map(u => u.material_benamning)).size}
            </p>
            <p className="text-xs text-gray-500">Unika material</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {uttag.reduce((sum, u) => sum + (u.antal || 0), 0)}
            </p>
            <p className="text-xs text-gray-500">Totalt antal</p>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{search ? 'Inga uttag matchar sökningen' : 'Inga uttag registrerade ännu'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{u.material_benamning}</p>
                      <Badge className={`text-xs ${TYP_COLORS[u.typ] || TYP_COLORS.uttag}`}>
                        {TYP_LABELS[u.typ] || 'Uttag'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">{u.antal} {u.enhet || 'st'}</span> → {u.kund_namn}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {u.ordernummer && <span>Order: {u.ordernummer}</span>}
                      <span>Av: {u.uttagen_av_namn}</span>
                      {u.material_artikelnummer && <span>Art.nr: {u.material_artikelnummer}</span>}
                    </div>
                    {u.notering && <p className="text-xs text-gray-400 mt-1 italic">{u.notering}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                    {moment(u.datum).format('YYYY-MM-DD HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}