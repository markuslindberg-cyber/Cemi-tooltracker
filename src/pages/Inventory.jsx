import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import ToolCard from '@/components/ui/ToolCard';
import TransferModal from '@/components/modals/TransferModal';
import ToolFormModal from '@/components/modals/ToolFormModal';
import ToolScanModal from '@/components/modals/ToolScanModal';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Download,
  Upload,
  FileSpreadsheet,
  ScanLine,
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
  available: { label: "Tillgänglig", color: "bg-emerald-100 text-emerald-700" },
  in_use: { label: "I bruk", color: "bg-blue-100 text-blue-700" },
  maintenance: { label: "Underhåll", color: "bg-amber-100 text-amber-700" },
  missing: { label: "Saknas", color: "bg-red-100 text-red-700" },
  retired: { label: "Kasserad", color: "bg-gray-100 text-gray-600" },
};

const categoryLabels = {
  power_tools: "Power Tools",
  hand_tools: "Hand Tools",
  measuring: "Measuring",
  safety: "Safety",
  accessories: "Accessories",
  heavy_equipment: "Heavy Equipment",
  vehicles: "Vehicles",
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
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('updated');
  const [transferTool, setTransferTool] = useState(null);
  const [editTool, setEditTool] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
  });

  // Only display tools (no arbetskläder)
  const allItems = useMemo(() => tools.map(t => ({ ...t, type: 'tool' })), [tools]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['serviceRecords'],
    queryFn: () => base44.entities.ServiceRecord.list('-service_date', 1000),
  });

  // Calculate service costs per tool
  const serviceCostsByTool = useMemo(() => {
    const costs = {};
    serviceRecords.forEach(record => {
      if (!costs[record.tool_id]) costs[record.tool_id] = 0;
      costs[record.tool_id] += record.cost || 0;
    });
    return costs;
  }, [serviceRecords]);

  const filteredTools = useMemo(() => {
    const filtered = allItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSubcategory = subcategoryFilter === 'all' || item.subcategory === subcategoryFilter;
      const matchesManufacturer = manufacturerFilter === 'all' || item.manufacturer === manufacturerFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesLocation = locationFilter === 'all' || item.location_name === locationFilter;
      const matchesAssignedTo = assignedToFilter === 'all' || 
        (assignedToFilter === 'unassigned' ? !item.assigned_to_name : item.assigned_to_name === assignedToFilter);
      
      return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory && 
             matchesManufacturer && matchesCondition && matchesLocation && matchesAssignedTo;
    });

    // Sort the filtered items
    return filtered.sort((a, b) => {
      if (sortBy === 'last_checked') {
        const aDate = a.last_seen_date ? new Date(a.last_seen_date).getTime() : 0;
        const bDate = b.last_seen_date ? new Date(b.last_seen_date).getTime() : 0;
        return bDate - aDate; // Most recent first
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '');
      } else { // 'updated'
        const aDate = new Date(a.updated_date).getTime();
        const bDate = new Date(b.updated_date).getTime();
        return bDate - aDate;
      }
    });
  }, [allItems, searchQuery, statusFilter, categoryFilter, subcategoryFilter, sortBy]);

  const availableCategories = useMemo(() => {
    return [...new Set(allItems.map(t => t.category).filter(Boolean))].sort();
  }, [allItems]);

  const availableSubcategories = useMemo(() => {
    if (categoryFilter === 'all') {
      return [...new Set(allItems.map(t => t.subcategory).filter(Boolean))].sort();
    }
    return [...new Set(
      allItems.filter(t => t.category === categoryFilter).map(t => t.subcategory).filter(Boolean)
    )].sort();
  }, [allItems, categoryFilter]);

  const availableManufacturers = useMemo(() => {
    return [...new Set(allItems.map(t => t.manufacturer).filter(Boolean))].sort();
  }, [allItems]);

  const availableLocations = useMemo(() => {
    return [...new Set(allItems.map(t => t.location_name).filter(Boolean))].sort();
  }, [allItems]);

  const availableAssignedTo = useMemo(() => {
    return [...new Set(allItems.map(t => t.assigned_to_name).filter(Boolean))].sort();
  }, [allItems]);

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
    if (window.confirm(`Är du säker på att du vill ta bort "${tool.name}"?`)) {
      await base44.entities.Tool.delete(tool.id);
      queryClient.invalidateQueries(['tools']);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setManufacturerFilter('all');
    setConditionFilter('all');
    setLocationFilter('all');
    setAssignedToFilter('all');
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'manufacturer', 'model_number', 'category', 'subcategory', 'status', 'condition', 'barcode', 'purchase_date', 'purchase_price', 'purchase_location', 'invoice_number', 'location_name', 'assigned_to_name', 'notes'];

    // Add example row and empty rows
    const exampleRow = ['Impact Driver', 'DeWalt', 'DCF887B', 'power_tools', 'Impact Drivers', 'available', 'good', '', '2026-01-01', '199.99', 'Home Depot', 'INV-001', 'Main Warehouse', 'John Smith', 'Example tool'];
    const emptyRows = Array(19).fill(Array(15).fill(''));

    const csvContent = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(','),
      ...emptyRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tool_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToExcel = () => {
    // Create CSV content
    const headers = ['Name', 'Manufacturer', 'Model Number', 'Category', 'Subcategory', 'Status', 'Condition', 'Barcode', 'Purchase Date', 'Purchase Price', 'Purchased From', 'Invoice Number', 'Service Costs', 'Location', 'Assigned To', 'Notes'];
    const rows = tools.map(tool => {
      const serviceCost = serviceCostsByTool[tool.id] || 0;
      return [
        tool.name || '',
        tool.manufacturer || '',
        tool.model_number || '',
        tool.category || '',
        tool.subcategory || '',
        tool.status || '',
        tool.condition || '',
        tool.barcode || '',
        tool.purchase_date || '',
        tool.purchase_price || '',
        tool.purchase_location || '',
        tool.invoice_number || '',
        serviceCost,
        tool.location_name || '',
        tool.assigned_to_name || '',
        tool.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFromExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from file
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            manufacturer: { type: "string" },
            model_number: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            status: { type: "string" },
            condition: { type: "string" },
            barcode: { type: "string" },
            purchase_date: { type: "string" },
            purchase_price: { type: "number" },
            purchase_location: { type: "string" },
            invoice_number: { type: "string" },
            location_name: { type: "string" },
            assigned_to_name: { type: "string" },
            notes: { type: "string" },
          }
        }
      });

      if (result.status === 'success' && result.output) {
        // Handle both single object and array responses
        const toolsData = Array.isArray(result.output) ? result.output : [result.output];
        
        // Filter out empty rows (rows without a name)
        const validTools = toolsData.filter(tool => tool.name && tool.name.trim() !== '');
        
        if (validTools.length === 0) {
          alert('Inga giltiga verktygsdata hittades i filen. Kontrollera att du har fyllt i minst Namn-kolumnen.');
          return;
        }
        
        // Create tools in bulk
        const toolsToCreate = validTools.map(tool => ({
          name: tool.name,
          manufacturer: tool.manufacturer || '',
          model_number: tool.model_number || '',
          category: tool.category || 'other',
          subcategory: tool.subcategory || '',
          status: tool.status || 'available',
          condition: tool.condition || 'good',
          barcode: tool.barcode || '',
          purchase_date: tool.purchase_date || '',
          purchase_price: tool.purchase_price || null,
          purchase_location: tool.purchase_location || '',
          invoice_number: tool.invoice_number || '',
          location_name: tool.location_name || '',
          assigned_to_name: tool.assigned_to_name || '',
          notes: tool.notes || '',
        }));

        await base44.entities.Tool.bulkCreate(toolsToCreate);
        queryClient.invalidateQueries(['tools']);
        alert(`${toolsToCreate.length} verktyg importerades!`);
      } else {
        const errorMsg = result.details || 'Okänt fel';
        alert(`Kunde inte extrahera data från filen: ${errorMsg}\n\nKontrollera filformatet och att kolumnrubriker matchar mallen.`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Importen misslyckades: ${error.message || error}\n\nKontrollera att filen har rätt format och innehåller giltig data.`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Maskiner</h1>
            <p className="text-gray-500 mt-1">
              {filteredTools.length} verktyg
              {(statusFilter !== 'all' || categoryFilter !== 'all' || subcategoryFilter !== 'all' || manufacturerFilter !== 'all' || conditionFilter !== 'all' || locationFilter !== 'all' || assignedToFilter !== 'all' || searchQuery) && ' matchar filter'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowScanModal(true)}
              variant="outline"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Inventera (skanna)
            </Button>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Ladda ned mall
            </Button>
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              disabled={tools.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportera data
            </Button>
            <label>
              <Button
                variant="outline"
                disabled={importing}
                asChild
              >
                <span>
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importerar...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importera
                    </>
                  )}
                </span>
              </Button>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFromExcel}
                className="hidden"
                disabled={importing}
              />
            </label>
            <Button
              onClick={() => setShowAddTool(true)}
              className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
            >
              <Plus className="w-5 h-5 mr-2" />
              Lägg till verktyg
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            subcategoryFilter={subcategoryFilter}
            onSubcategoryChange={setSubcategoryFilter}
            manufacturerFilter={manufacturerFilter}
            onManufacturerChange={setManufacturerFilter}
            conditionFilter={conditionFilter}
            onConditionChange={setConditionFilter}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            assignedToFilter={assignedToFilter}
            onAssignedToChange={setAssignedToFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onClearFilters={clearFilters}
            availableCategories={availableCategories}
            availableSubcategories={availableSubcategories}
            availableManufacturers={availableManufacturers}
            availableLocations={availableLocations}
            availableAssignedTo={availableAssignedTo}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />
        </div>

        {/* Content */}
        {filteredTools.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {tools.length === 0 ? 'Inga verktyg i inventariet' : 'Inga verktyg matchar dina filter'}
            </h3>
            <p className="text-gray-500 mb-4">
              {tools.length === 0 
                ? 'Lägg till ditt första verktyg för att komma igång'
                : 'Försök justera din sökning eller dina filter'}
            </p>
            {tools.length === 0 ? (
              <Button
                onClick={() => setShowAddTool(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till första verktyget
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Rensa filter
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => {
              const serviceCost = serviceCostsByTool[tool.id] || 0;
              return (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  serviceCost={serviceCost}
                  onTransfer={setTransferTool}
                  onEdit={setEditTool}
                  onStatusChange={handleStatusChange}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Verktyg</TableHead>
                  <TableHead className="font-semibold">Kategori</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Plats</TableHead>
                  <TableHead className="font-semibold">Tilldelad</TableHead>
                  <TableHead className="font-semibold">Inköpspris</TableHead>
                  <TableHead className="font-semibold">Servicekostnader</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map((tool) => {
                  const status = statusConfig[tool.status] || statusConfig.available;
                  const serviceCost = serviceCostsByTool[tool.id] || 0;
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
                            {tool.subcategory && (
                              <p className="text-xs text-gray-500">{tool.subcategory}</p>
                            )}
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
                      <TableCell className="font-medium text-gray-900">
                        {serviceCost > 0 ? (
                          <span className="text-[#8B1E1E]">${serviceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          '—'
                        )}
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
                              Redigera verktyg
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setTransferTool(tool);
                            }}>
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Förflytta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tool.status !== 'missing' && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(tool, 'missing');
                                }}
                                className="text-[#8B1E1E]"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Rapportera saknad
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

      <ToolScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        tools={tools}
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