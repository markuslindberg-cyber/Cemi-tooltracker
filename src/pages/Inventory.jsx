import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import ToolCard from '@/components/ui/ToolCard';
import TransferModal from '@/components/modals/TransferModal';
import ToolFormModal from '@/components/modals/ToolFormModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  MapPin,
  User,
  MoreVertical,
  ArrowRightLeft,
  Wrench,
  AlertTriangle,
  Loader2,
  Package,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

const statusConfig = {
  available: { label: "Available", color: "bg-emerald-100 text-emerald-700" },
  in_use: { label: "In Use", color: "bg-blue-100 text-blue-700" },
  maintenance: { label: "Maintenance", color: "bg-amber-100 text-amber-700" },
  missing: { label: "Missing", color: "bg-red-100 text-red-700" },
  retired: { label: "Retired", color: "bg-gray-100 text-gray-600" },
};

const categoryLabels = {
  power_tools: "Power Tools",
  hand_tools: "Hand Tools",
  measuring: "Measuring",
  safety: "Safety",
  accessories: "Accessories",
  heavy_equipment: "Heavy Equipment",
  other: "Other",
};

export default function Inventory() {
  const queryClient = useQueryClient();
  
  // Get initial status from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialStatus = urlParams.get('status') || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [transferTool, setTransferTool] = useState(null);
  const [editTool, setEditTool] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesSearch = !searchQuery || 
        tool.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.model_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || tool.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tools, searchQuery, statusFilter, categoryFilter]);

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
    queryClient.invalidateQueries(['tools']);
    setTransferTool(null);
  };

  const handleSaveTool = async (toolData) => {
    if (editTool?.id) {
      await base44.entities.Tool.update(editTool.id, toolData);
    } else {
      await base44.entities.Tool.create(toolData);
    }
    queryClient.invalidateQueries(['tools']);
    setEditTool(null);
    setShowAddTool(false);
  };

  const handleStatusChange = async (tool, newStatus) => {
    await base44.entities.Tool.update(tool.id, { status: newStatus });
    queryClient.invalidateQueries(['tools']);
  };

  const handleDeleteTool = async (tool) => {
    if (window.confirm(`Are you sure you want to delete "${tool.name}"?`)) {
      await base44.entities.Tool.delete(tool.id);
      queryClient.invalidateQueries(['tools']);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-500 mt-1">
              {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} 
              {(statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && ' matching filters'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddTool(true)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Tool
          </Button>
        </div>

        {/* Search & Filters */}
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onClearFilters={clearFilters}
        />

        {/* Content */}
        {filteredTools.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {tools.length === 0 ? 'No tools in inventory' : 'No tools match your filters'}
            </h3>
            <p className="text-gray-500 mb-4">
              {tools.length === 0 
                ? 'Add your first tool to get started'
                : 'Try adjusting your search or filters'}
            </p>
            {tools.length === 0 ? (
              <Button
                onClick={() => setShowAddTool(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Tool
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onTransfer={setTransferTool}
                onEdit={setEditTool}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Tool</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Assigned To</TableHead>
                  <TableHead className="font-semibold">Value</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map((tool) => {
                  const status = statusConfig[tool.status] || statusConfig.available;
                  return (
                    <TableRow 
                      key={tool.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setEditTool(tool)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                            {tool.image_url ? (
                              <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              '🔧'
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tool.name}</p>
                            {tool.model_number && (
                              <p className="text-sm text-gray-500">{tool.model_number}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {categoryLabels[tool.category] || tool.category}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border-0`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tool.location_name ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {tool.location_name}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tool.assigned_to_name ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <User className="w-4 h-4 text-gray-400" />
                            {tool.assigned_to_name}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {tool.purchase_price ? `$${tool.purchase_price.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditTool(tool);
                            }}>
                              <Wrench className="w-4 h-4 mr-2" />
                              Edit Tool
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setTransferTool(tool);
                            }}>
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Transfer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tool.status !== 'missing' && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(tool, 'missing');
                                }}
                                className="text-red-600"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Report Missing
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
    </div>
  );
}