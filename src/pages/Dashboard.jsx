import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/ui/StatsCard';
import PendingRequestsChart from '@/components/dashboard/PendingRequestsChart';
import TransferModal from '@/components/modals/TransferModal';
import ToolFormModal from '@/components/modals/ToolFormModal';
import LoanRequestModal from '@/components/modals/LoanRequestModal';
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
  RotateCw,
  SprayCan,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [transferTool, setTransferTool] = useState(null);
  const [editTool, setEditTool] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showLoanRequest, setShowLoanRequest] = useState(false);
  const queryClient = useQueryClient();

  const { data: tools = [], refetch: refetchTools, isLoading } = useQuery({
    queryKey: ['dashboardTools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 2000).then(r => r.filter(t => !t.is_deleted)),
    staleTime: 0,
  });

  const { containerRef, isPulling, pullDistance, PULL_THRESHOLD } = usePullToRefresh(
    () => queryClient.invalidateQueries(['dashboardTools']),
    isLoading
  );

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

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: loanRequests = [] } = useQuery({
    queryKey: ['loanRequests'],
    queryFn: () => base44.entities.LoanRequest.list(),
  });

  const { data: workwearRequests = [] } = useQuery({
    queryKey: ['workwearRequestsPending'],
    queryFn: () => base44.entities.WorkwearRequest.list(),
  });

  const { data: lokalvardRequests = [] } = useQuery({
    queryKey: ['lokalvardRequestsPending'],
    queryFn: () => base44.entities.LokalvardArtikelRequest.list(),
  });

  // Stats calculations - match Inventory page exactly
  const HIDDEN_STATUSES = ['såld', 'sålda', 'retired', 'missing'];
  const activeTools = tools.filter(t => !HIDDEN_STATUSES.includes(t.status));
  const totalTools = activeTools.length;
  const availableTools = activeTools.filter(t => t.status === 'available').length;
  const inUseTools = activeTools.filter(t => t.status === 'in_use').length;
  const missingTools = tools.filter(t => t.status === 'missing').length;
  const maintenanceTools = activeTools.filter(t => t.status === 'maintenance').length;

  const soldTools = tools.filter(t => t.status === 'såld').length;
  const retiredTools = tools.filter(t => t.status === 'retired').length;
  const iLagerTools = activeTools.filter(t => t.status === 'i_lager').length;

  // Calculate total value from active tools only - exclude handTools to avoid async flicker
  const totalValue = activeTools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);

  const toolMutation = useMutation({
    mutationFn: async (toolData) => {
      if (editTool?.id) {
        return base44.entities.Tool.update(editTool.id, toolData);
      } else {
        return base44.entities.Tool.create(toolData);
      }
    },
    onMutate: async (toolData) => {
      await queryClient.cancelQueries({ queryKey: ['dashboardTools'] });
      const prevTools = queryClient.getQueryData(['dashboardTools']);
      if (editTool?.id) {
        queryClient.setQueryData(['dashboardTools'], (old) =>
          old?.map(t => t.id === editTool.id ? { ...t, ...toolData } : t) || []
        );
      } else {
        queryClient.setQueryData(['dashboardTools'], (old) => [...(old || []), { ...toolData, id: 'temp-' + Date.now() }]);
      }
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['dashboardTools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardTools'] });
      setEditTool(null);
      setShowAddTool(false);
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (transferData) => {
      await base44.entities.Transfer.create(transferData);
      return base44.entities.Tool.update(transferData.tool_id, {
        location_id: transferData.to_location_id,
        location_name: transferData.to_location_name,
        assigned_to_email: transferData.to_person_email,
        assigned_to_name: transferData.to_person_name,
        status: 'in_use',
        last_seen_date: new Date().toISOString(),
      });
    },
    onMutate: async (transferData) => {
      await queryClient.cancelQueries({ queryKey: ['dashboardTools'] });
      const prevTools = queryClient.getQueryData(['dashboardTools']);
      queryClient.setQueryData(['dashboardTools'], (old) =>
        old?.map(t => t.id === transferData.tool_id 
          ? { ...t, location_id: transferData.to_location_id, location_name: transferData.to_location_name, status: 'in_use' }
          : t
        ) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['dashboardTools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardTools'] });
      setTransferTool(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (data) => base44.entities.Tool.update(data.id, { status: data.newStatus }),
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboardTools'] });
      const prevTools = queryClient.getQueryData(['dashboardTools']);
      queryClient.setQueryData(['dashboardTools'], (old) =>
        old?.map(t => t.id === id ? { ...t, status: newStatus } : t) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['dashboardTools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardTools'] });
    },
  });

  const handleTransfer = (transferData) => transferMutation.mutate(transferData);
  const handleSaveTool = (toolData) => toolMutation.mutate(toolData);
  const handleStatusChange = (tool, newStatus) => statusMutation.mutate({ id: tool.id, newStatus });

  const recentlyUsedTools = activeTools.slice(0, 6);

  // Loan statistics
  const requestsToApprove = user ? loanRequests.filter(r => r.approver_email === user.email && r.status === 'pending').length : 0;
  const myLoans = user ? loanRequests.filter(r => r.assigned_to_email === user.email && r.status === 'approved').reduce((sum, r) => sum + r.tool_ids.length, 0) : 0;
  const borrowedTools = user ? loanRequests.filter(r => r.destination_location_manager_email === user.email && r.status === 'approved').reduce((sum, r) => sum + r.tool_ids.length, 0) : 0;
  const activeLoans = loanRequests.filter(r => r.status === 'approved').length;
  const pendingRequests = loanRequests.filter(r => r.status === 'pending').length;
  const rejectedRequests = loanRequests.filter(r => r.status === 'rejected').length;
  
  const pendingLoanCount = loanRequests.filter(r => r.status === 'pending').length;
  const pendingWorkwearCount = workwearRequests.filter(r => r.status === 'pending').length;
  const pendingLokalvardCount = lokalvardRequests.filter(r => r.status === 'pending').length;

  const loansByLocation = locations.map(location => ({
    ...location,
    activeLoans: loanRequests.filter(r => r.destination_location_id === location.id && r.status === 'approved').length
  })).filter(l => l.activeLoans > 0);

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8 overflow-y-auto" style={{ transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)', transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}>
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none">
          <div style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }}>
            {isPulling ? (
              <span className="text-xs text-gray-500">Uppdaterar...</span>
            ) : (
              <div className="text-xs text-gray-500">{pullDistance >= PULL_THRESHOLD ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}</div>
            )}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-5 lg:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 hidden sm:block">Spåra, hantera och anpassa dina verktyg</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => setShowLoanRequest(true)}
              size="sm"
              variant="outline"
            >
              <RotateCw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Skicka låneförfrågan</span>
              <span className="sm:hidden">Lån</span>
            </Button>
            <Button
              onClick={() => setShowAddTool(true)}
              size="sm"
              className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Lägg till verktyg</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

        {/* Loan Requests Alert */}
        {requestsToApprove > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-600/25">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{requestsToApprove} låneförfrågan behöver godkännas</h3>
                  <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Granska och godkänn eller neka förfrågningar</p>
                </div>
              </div>
              <Link to="/Transfers" className="shrink-0">
                <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-gray-50">
                  Visa alla
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Lokalvård Shortcut */}
        {user?.role === 'lokalvårdare' && (
          <Link to="/RequestWorkwear">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-emerald-800 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl shrink-0">
                    <SprayCan className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Begär lokalvårdsartiklar</h3>
                    <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Skicka en begäran om uttag av lokalvårdsprodukter</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
              </div>
            </div>
          </Link>
        )}

        {/* Missing Tools Alert */}
        {missingTools > 0 && (
          <div className="bg-gradient-to-r from-[#8B1E1E] to-[#6B1515] rounded-2xl p-4 text-white shadow-lg shadow-[#8B1E1E]/25">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{missingTools} verktyg rapporterade saknade</h3>
                  <p className="text-white/80 text-xs sm:text-sm hidden sm:block">Granska och hantera saknad utrustning</p>
                </div>
              </div>
              <Link to="/Inventory/SaldaRedskap" className="shrink-0">
                <Button variant="secondary" size="sm" className="bg-white text-[#8B1E1E] hover:bg-gray-50">
                  Visa alla
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
         {user?.role !== 'lokalvårdare' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
           {/* Sidebar First */}
           <div className="space-y-4 lg:order-2">
            {/* Loan Summary */}
             <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
               <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Låneöversikt</h3>
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-500 dark:text-gray-400">Aktiva lån</span>
                   <span className="font-medium text-gray-900 dark:text-gray-100">{activeLoans}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-500 dark:text-gray-400">Väntande förfrågningar</span>
                   <span className="font-medium text-amber-600">{pendingRequests}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-500 dark:text-gray-400">Nekade förfrågningar</span>
                   <span className="font-medium text-red-600">{rejectedRequests}</span>
                 </div>
                 {(myLoans > 0 || borrowedTools > 0) && (
                   <>
                     <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                       {myLoans > 0 && (
                         <div className="flex justify-between items-center">
                           <span className="text-sm text-gray-500 dark:text-gray-400">Maskiner jag lånat</span>
                           <span className="font-medium text-gray-900 dark:text-gray-100">{myLoans}</span>
                         </div>
                       )}
                       {borrowedTools > 0 && (
                         <div className="flex justify-between items-center">
                           <span className="text-sm text-gray-500 dark:text-gray-400">Från andra platser</span>
                           <span className="font-medium text-gray-900 dark:text-gray-100">{borrowedTools}</span>
                         </div>
                       )}
                     </div>
                   </>
                 )}
               </div>
               <Link to="/Transfers" className="mt-4 block">
                 <Button variant="outline" size="sm" className="w-full">
                   Hantera lån
                   <ArrowRight className="w-3 h-3 ml-1" />
                 </Button>
               </Link>
             </div>

            {/* Pending Requests Chart */}
            <PendingRequestsChart
              loanCount={pendingLoanCount}
              workwearCount={pendingWorkwearCount}
              lokalvardCount={pendingLokalvardCount}
            />

            {/* Inventory value */}
             <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
               <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Inventarievärde</h3>
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-500 dark:text-gray-400">Maskiner ({activeTools.length})</span>
                   <span className="font-medium text-gray-900 dark:text-gray-100">{totalValue.toLocaleString('sv-SE')} kr</span>
                 </div>
                 <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                   <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Totalt</span>
                   <span className="font-bold text-[#8B1E1E]">{totalValue.toLocaleString('sv-SE')} kr</span>
                 </div>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                 {[
                   { label: 'Tillgänglig', count: availableTools, color: 'bg-emerald-500' },
                   { label: 'I bruk', count: inUseTools, color: 'bg-blue-500' },
                   { label: 'I lager', count: iLagerTools, color: 'bg-cyan-500' },
                   { label: 'Underhåll', count: maintenanceTools, color: 'bg-amber-500' },
                   ].map(({ label, count, color }) => (
                   <div key={label} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${color}`} />
                       <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                     </div>
                     <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                   </div>
                 ))}
               </div>
             </div>

             {/* Active Loans by Location */}
              {loansByLocation.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Platser med aktiva lån</h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {loansByLocation.map(location => (
                      <Link key={location.id} to={`/locations/${location.id}`} className="block">
                        <div className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{location.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                            {location.activeLoans} aktiva lån
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

             {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                 <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                   <h3 className="font-semibold text-gray-900 dark:text-gray-100">Senaste förflyttningar</h3>
                 </div>
                {recentTransfers.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentTransfers.map((transfer) => (
                      <div key={transfer.id} className="px-5 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{transfer.tool_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {transfer.from_location_name || '—'} → {transfer.to_location_name || '—'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {transfer.transfer_date && format(new Date(transfer.transfer_date), 'd MMM')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Clock className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">Inga förflyttningar</p>
                  </div>
                )}
              </div>
           </div>

           {/* Recent Tools - simple list */}
           <div className="lg:col-span-2 lg:order-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Senaste maskiner</h2>
              <Link to={createPageUrl('Inventory')}>
                <Button variant="ghost" size="sm" className="text-[#8B1E1E] hover:text-[#6B1515] hover:bg-[#8B1E1E]/10">
                  Visa alla <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {activeTools.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                  <Wrench className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Inga maskiner ännu</p>
                <Button onClick={() => setShowAddTool(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
                  <Plus className="w-4 h-4 mr-2" /> Lägg till maskin
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                 <div className="divide-y divide-gray-100 dark:divide-gray-800">
                   {recentlyUsedTools.map(tool => (
                     <div key={tool.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => setEditTool(tool)}>
                       {tool.image_url ? (
                         <img src={tool.image_url} alt={tool.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                       ) : (
                         <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                           <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                         </div>
                       )}
                       <div className="flex-1 min-w-0">
                         <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{tool.name}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tool.manufacturer}{tool.model_number ? ` · ${tool.model_number}` : ''}</p>
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
                         {tool.location_name && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[120px]">{tool.location_name}</p>}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </div>


          </div>
          )}
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

      <LoanRequestModal
        isOpen={showLoanRequest}
        onClose={() => setShowLoanRequest(false)}
      />
    </div>
  );
}