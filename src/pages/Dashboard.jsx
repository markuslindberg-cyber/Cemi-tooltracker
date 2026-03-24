import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/ui/StatsCard';
import ToolCard from '@/components/ui/ToolCard';
import TransferModal from '@/components/modals/TransferModal';
import ToolFormModal from '@/components/modals/ToolFormModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const recentlyUsedTools = tools.slice(0, 8);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
            <StatsCard
              title="Saknas"
              value={missingTools}
              icon={AlertTriangle}
              iconClassName="bg-[#8B1E1E]/10"
              className="border-[#8B1E1E]/20 bg-[#8B1E1E]/5"
            />
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
          <div className="bg-gradient-to-r from-[#8B1E1E] to-[#6B1515] rounded-2xl p-6 text-white shadow-lg shadow-[#8B1E1E]/25">
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
              <Link to={createPageUrl('Inventory') + '?status=missing'}>
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
          {/* Recent Tools */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Senaste verktyg</h2>
              <Link to={createPageUrl('Inventory')}>
                <Button variant="ghost" size="sm" className="text-[#8B1E1E] hover:text-[#6B1515] hover:bg-[#8B1E1E]/10">
                  Visa alla
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentlyUsedTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onTransfer={setTransferTool}
                  onEdit={setEditTool}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
            {tools.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Inga verktyg ännu</h3>
                <p className="text-gray-500 mb-4">Lägg till ditt första verktyg för att börja spåra inventariet</p>
                <Button
                  onClick={() => setShowAddTool(true)}
                  className="bg-[#8B1E1E] hover:bg-[#6B1515]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till första verktyget
                </Button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Senaste aktivitet</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {recentTransfers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentTransfers.map((transfer) => (
                    <div key={transfer.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{transfer.tool_name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {transfer.from_location_name || 'Okänd'} → {transfer.to_location_name || 'Okänd'}
                          </p>
                          {transfer.to_person_name && (
                            <p className="text-xs text-gray-400 mt-1">
                              Tilldelad {transfer.to_person_name}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {transfer.transfer_date && format(new Date(transfer.transfer_date), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Inga senaste förflyttningar</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Inventarievärde</h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Maskiner</p>
                  <p className="text-2xl font-bold text-gray-900">{totalValue.toLocaleString('sv-SE')} kr</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tools.length} maskiner</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Handredskap</p>
                  <p className="text-2xl font-bold text-gray-900">{handToolsValue.toLocaleString('sv-SE')} kr</p>
                  <p className="text-xs text-gray-400 mt-0.5">{handTools.length} redskap</p>
                </div>
                <div className="p-4 bg-[#8B1E1E]/5 rounded-xl border border-[#8B1E1E]/10">
                  <p className="text-xs font-medium text-[#8B1E1E] uppercase tracking-wide mb-1">Totalt</p>
                  <p className="text-2xl font-bold text-[#8B1E1E]">{(totalValue + handToolsValue).toLocaleString('sv-SE')} kr</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Per status (maskiner)</h4>
                <div className="space-y-2">
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