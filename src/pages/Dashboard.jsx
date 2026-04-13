import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/ui/StatsCard';
import TransferModal from '@/components/modals/TransferModal';
import ToolFormModal from '@/components/modals/ToolFormModal';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  MapPin,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Clock,
  TrendingUp,
  ChevronRight,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [transferTool, setTransferTool] = useState(null);
  const [editTool, setEditTool] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);

  const { data: tools = [], refetch: refetchTools } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 100),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: recentTransfers = [] } = useQuery({
    queryKey: ['recentTransfers'],
    queryFn: () => base44.entities.Transfer.list('-transfer_date', 5),
  });

  const { data: handTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 500),
  });

  // Stats calculations
  const totalTools = tools.length;
  const availableTools = tools.filter(t => t.status === 'available').length;
  const inUseTools = tools.filter(t => t.status === 'in_use').length;
  const missingTools = tools.filter(t => t.status === 'missing').length;
  const maintenanceTools = tools.filter(t => t.status === 'maintenance').length;

  const soldTools = tools.filter(t => t.status === 'såld').length;

  const totalValue = tools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);
  const handToolsValue = handTools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);

  const handleTransfer = async (transferData) => {
    await base44.entities.Transfer.create(transferData);
    await base44.entities.Tool.update(transferData.tool_id, {
      location_id: transferData.to_location_id,
      location_name: transferData.to_location_name,
      assigned_to_email: transferData.to_person_email,
      assigned_to_name: transferData.to_person_name,
      status: 'in_use',
      last_seen_date: new Date().toISOString(),
    });
    refetchTools();
    setTransferTool(null);
  };

  const handleSaveTool = async (toolData) => {
    if (editTool?.id) {
      await base44.entities.Tool.update(editTool.id, toolData);
    } else {
      await base44.entities.Tool.create(toolData);
    }
    refetchTools();
    setEditTool(null);
    setShowAddTool(false);
  };

  const handleStatusChange = async (tool, newStatus) => {
    await base44.entities.Tool.update(tool.id, { status: newStatus });
    refetchTools();
  };

  const recentlyUsedTools = tools.filter(t => !['såld','retired','missing'].includes(t.status)).slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Spåra, hantera och anpassa dina verktyg</p>
          </div>
          <Button
            onClick={() => setShowAddTool(true)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Lägg till verktyg
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-1.5 lg:gap-2">
          <StatsCard
            title="Totalt antal verktyg"
            value={totalTools}
            icon={Wrench}
            iconClassName="bg-[#8B1E1E]/10"
            trend={12}
            trendLabel="vs last month"
          />
          <StatsCard
            title="Tillgängliga"
            value={availableTools}
            icon={TrendingUp}
            iconClassName="bg-emerald-50"
          />
          <StatsCard
            title="I bruk"
            value={inUseTools}
            icon={Users}
            iconClassName="bg-blue-50"
          />
          {missingTools > 0 ? (
            <Link to="/Inventory/SaldaRedskap" className="block">
              <StatsCard
                title="Saknas"
                value={missingTools}
                icon={AlertTriangle}
                iconClassName="bg-[#8B1E1E]/10"
                className="border-[#8B1E1E]/20 bg-[#8B1E1E]/5 cursor-pointer hover:shadow-md transition-shadow"
              />
            </Link>
          ) : (
            <StatsCard
              title="Platser"
              value={locations.length}
              icon={MapPin}
              iconClassName="bg-purple-50"
            />
          )}
        </div>

        {/* Missing Tools Alert */}
        {missingTools > 0 && (
          <div className="bg-gradient-to-r from-[#8B1E1E] to-[#6B1515] rounded-2xl p-4 text-white shadow-lg shadow-[#8B1E1E]/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{missingTools} verktyg rapporterade saknade</h3>
                  <p className="text-white/80 text-sm">Granska och hantera saknad utrustning</p>
                </div>
              </div>
              <Link to="/Inventory/SaldaRedskap">
                <Button variant="secondary" className="bg-white text-[#8B1E1E] hover:bg-gray-50">
                  Visa alla
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tools - simple list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Senaste maskiner</h2>
              <Link to={createPageUrl('Inventory')}>
                <Button variant="ghost" size="sm" className="text-[#8B1E1E] hover:text-[#6B1515] hover:bg-[#8B1E1E]/10">
                  Visa alla <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {tools.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Inga maskiner ännu</p>
                <Button onClick={() => setShowAddTool(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
                  <Plus className="w-4 h-4 mr-2" /> Lägg till maskin
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {recentlyUsedTools.map(tool => (
                    <div key={tool.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setEditTool(tool)}>
                      {tool.image_url ? (
                        <img src={tool.image_url} alt={tool.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{tool.name}</p>
                        <p className="text-sm text-gray-500 truncate">{tool.manufacturer}{tool.model_number ? ` · ${tool.model_number}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          tool.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                          tool.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                          tool.status === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {tool.status === 'available' ? 'Tillgänglig' :
                           tool.status === 'in_use' ? 'I bruk' :
                           tool.status === 'i_lager' ? 'I lager' :
                           tool.status === 'maintenance' ? 'Underhåll' : tool.status}
                        </span>
                        {tool.location_name && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{tool.location_name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Inventory value */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Inventarievärde</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Maskiner ({tools.length})</span>
                  <span className="font-medium text-gray-900">{totalValue.toLocaleString('sv-SE')} kr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Handredskap ({handTools.length})</span>
                  <span className="font-medium text-gray-900">{handToolsValue.toLocaleString('sv-SE')} kr</span>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Totalt</span>
                  <span className="font-bold text-[#8B1E1E]">{(totalValue + handToolsValue).toLocaleString('sv-SE')} kr</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {[
                  { label: 'Tillgänglig', count: availableTools, color: 'bg-emerald-500' },
                  { label: 'I bruk', count: inUseTools, color: 'bg-blue-500' },
                  { label: 'Underhåll', count: maintenanceTools, color: 'bg-amber-500' },
                  { label: 'Saknas', count: missingTools, color: 'bg-red-500' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Senaste förflyttningar</h3>
              </div>
              {recentTransfers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentTransfers.map((transfer) => (
                    <div key={transfer.id} className="px-5 py-3">
                      <p className="font-medium text-gray-900 text-sm truncate">{transfer.tool_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {transfer.from_location_name || '—'} → {transfer.to_location_name || '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {transfer.transfer_date && format(new Date(transfer.transfer_date), 'd MMM')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Inga förflyttningar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={!!transferTool}
        onClose={() => setTransferTool(null)}
        tool={transferTool}
        locations={locations}
        teamMembers={teamMembers}
        onSubmit={handleTransfer}
      />

      <ToolFormModal
        isOpen={showAddTool || !!editTool}
        onClose={() => {
          setShowAddTool(false);
          setEditTool(null);
        }}
        tool={editTool}
        locations={locations}
        teamMembers={teamMembers}
        onSubmit={handleSaveTool}
      />
    </div>
  );
}