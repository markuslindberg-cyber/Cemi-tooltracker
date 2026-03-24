import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, X, Package, MapPin, Edit, Trash2 } from 'lucide-react';
import HandToolBatchModal from '@/components/modals/HandToolBatchModal';
import HandToolEditModal from '@/components/modals/HandToolEditModal';

const statusConfig = {
  i_lager:  { label: 'I lager',  className: 'bg-green-100 text-green-800' },
  i_bruk:   { label: 'I bruk',   className: 'bg-blue-100 text-blue-800' },
  saknas:   { label: 'Saknas',   className: 'bg-red-100 text-red-800' },
  kasserad: { label: 'Kasserad', className: 'bg-gray-100 text-gray-600' },
};

const conditionConfig = {
  ny:    'Ny',
  bra:   'Bra',
  okej:  'Okej',
  dålig: 'Dålig',
};

export default function HandTools() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editTool, setEditTool] = useState(null);

  const { data: handTools = [], isLoading } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 1000),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
  });

  const categories = [...new Set(handTools.map(t => t.category).filter(Boolean))].sort();
  const locationNames = [...new Set(handTools.map(t => t.location_name).filter(Boolean))].sort();

  const filtered = handTools.filter(t => {
    const q = search.toLowerCase();
    if (q && !`${t.name} ${t.manufacturer} ${t.category}`.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (locationFilter !== 'all' && t.location_name !== locationFilter) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, t) => {
    const key = `${t.name}__${t.category}__${t.manufacturer || ''}`;
    if (!acc[key]) acc[key] = { name: t.name, category: t.category, manufacturer: t.manufacturer, items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});

  const handleDelete = async (id) => {
    await base44.entities.HandTool.delete(id);
    queryClient.invalidateQueries(['handtools']);
  };

  const hasFilters = search || statusFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all';

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setLocationFilter('all');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Handredskap</h1>
          <p className="text-gray-500 text-sm mt-1">{handTools.length} redskap totalt</p>
        </div>
        <Button onClick={() => setShowBatchModal(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515] gap-2">
          <Plus className="w-4 h-4" />
          Lägg till redskap
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Sök på namn, kategori, tillverkare..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="i_lager">I lager</SelectItem>
                <SelectItem value="i_bruk">I bruk</SelectItem>
                <SelectItem value="saknas">Saknas</SelectItem>
                <SelectItem value="kasserad">Kasserad</SelectItem>
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {locationNames.length > 0 && (
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Plats" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla platser</SelectItem>
                  {locationNames.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 text-gray-400">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B1E1E] rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Package className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Inga redskap hittades</p>
          <p className="text-sm">Klicka på "Lägg till redskap" för att börja</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map((group) => {
            const byLocation = group.items.reduce((acc, item) => {
              const loc = item.location_name || 'Ingen plats';
              if (!acc[loc]) acc[loc] = [];
              acc[loc].push(item);
              return acc;
            }, {});
            const byStatus = group.items.reduce((acc, item) => {
              acc[item.status] = (acc[item.status] || 0) + 1;
              return acc;
            }, {});

            return (
              <div key={`${group.name}-${group.category}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Group Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-50">
                  <div>
                    <h2 className="font-semibold text-gray-900">{group.name}</h2>
                    <p className="text-sm text-gray-500">
                      {group.category}{group.manufacturer ? ` · ${group.manufacturer}` : ''} · {group.items.length} st totalt
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {Object.entries(byStatus).map(([s, count]) => (
                      <span key={s} className={`text-xs font-medium px-2 py-1 rounded-full ${statusConfig[s]?.className || 'bg-gray-100 text-gray-600'}`}>
                        {count} {statusConfig[s]?.label || s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Location breakdown */}
                <div className="divide-y divide-gray-50">
                  {Object.entries(byLocation).map(([locName, items]) => (
                    <div key={locName} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{locName}</span>
                        <span className="text-xs text-gray-400">({items.length} st)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 text-sm group">
                            <span className={`w-2 h-2 rounded-full ${item.status === 'i_lager' ? 'bg-green-500' : item.status === 'i_bruk' ? 'bg-blue-500' : item.status === 'saknas' ? 'bg-red-500' : 'bg-gray-400'}`} />
                            <span className="text-gray-700">{conditionConfig[item.condition] || item.condition}</span>
                            <button onClick={() => setEditTool(item)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity ml-1">
                              <Edit className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HandToolBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSuccess={() => queryClient.invalidateQueries(['handtools'])}
      />

      {editTool && (
        <HandToolEditModal
          isOpen={!!editTool}
          tool={editTool}
          locations={locations}
          onClose={() => setEditTool(null)}
          onSuccess={() => {
            queryClient.invalidateQueries(['handtools']);
            setEditTool(null);
          }}
        />
      )}
    </div>
  );
}