import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ToolFormModal from '@/components/modals/ToolFormModal';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Tag, AlertTriangle, Trash2 } from 'lucide-react';

const statusConfig = {
  såld: { label: 'Såld', color: 'bg-blue-100 text-blue-800', icon: Tag },
  retired: { label: 'Kasserad', color: 'bg-red-100 text-red-800', icon: Trash2 },
  missing: { label: 'Saknas', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
};

const INACTIVE_STATUSES = ['såld', 'retired', 'missing'];

export default function SåldaRedskap() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editTool, setEditTool] = useState(null);
  const queryClient = useQueryClient();

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['inactive-tools'],
    queryFn: () => base44.entities.Tool.list(),
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const handleSaveTool = async (toolData) => {
    if (editTool?.id) {
      await base44.entities.Tool.update(editTool.id, toolData);
    }
    queryClient.invalidateQueries(['inactive-tools']);
    setEditTool(null);
  };

  const inactiveTools = tools.filter(t => INACTIVE_STATUSES.includes(t.status));

  const filtered = inactiveTools.filter(t => {
    const matchSearch =
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      t.model_number?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'all' || t.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: inactiveTools.length,
    såld: inactiveTools.filter(t => t.status === 'såld').length,
    retired: inactiveTools.filter(t => t.status === 'retired').length,
    missing: inactiveTools.filter(t => t.status === 'missing').length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sålda & Kasserade</h1>
        <p className="text-gray-500 mt-1">Maskiner som är sålda, kasserade eller saknas</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'Alla' },
          { key: 'såld', label: 'Sålda' },
          { key: 'retired', label: 'Kasserade' },
          { key: 'missing', label: 'Saknas' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeFilter === key
                ? 'bg-[#8B1E1E] text-white border-[#8B1E1E]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Sök på namn, märke eller modell..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#8B1E1E] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Inga objekt hittades</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Namn</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Märke</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Modell</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plats</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Streckkod</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool, i) => {
                const cfg = statusConfig[tool.status] || { label: tool.status, color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={tool.id} onClick={() => setEditTool(tool)} className={`cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{tool.name}</td>
                    <td className="px-4 py-3 text-gray-600">{tool.manufacturer || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{tool.model_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tool.location_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tool.barcode || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ToolFormModal
        isOpen={!!editTool}
        onClose={() => setEditTool(null)}
        tool={editTool}
        locations={allLocations}
        teamMembers={teamMembers}
        onSubmit={handleSaveTool}
      />
    </div>
  );
}