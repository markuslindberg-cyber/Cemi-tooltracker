import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Grid3x3,
  List,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import ArbetskläderUtrustningFormModal from '@/components/modals/ArbetskläderUtrustningFormModal';
import SearchFilterBar from '@/components/ui/SearchFilterBar';

const statusMap = {
  i_lager: { label: 'I lager', class: 'bg-green-100 text-green-800' },
  i_bruk: { label: 'I bruk', class: 'bg-blue-100 text-blue-800' },
  saknas: { label: 'Saknas', class: 'bg-red-100 text-red-800' },
  kasserad: { label: 'Kasserad', class: 'bg-gray-100 text-gray-800' },
};

const conditionMap = {
  ny: { label: 'Ny', color: 'green' },
  bra: { label: 'Bra', color: 'blue' },
  okej: { label: 'Okej', color: 'yellow' },
  dålig: { label: 'Dålig', color: 'red' },
};

export default function ArbetskläderUtrustning() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['arbetskläder'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const categories = [...new Set(items.map(i => i.category))].sort();
  const subcategories = [...new Set(items.map(i => i.subcategory))].sort();
  const sizes = [...new Set(items.map(i => i.size))].sort();

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = search === '' || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesSubcategory = !filters.subcategory || item.subcategory === filters.subcategory;
      const matchesSize = !filters.size || item.size === filters.size;
      const matchesStatus = !filters.status || item.status === filters.status;

      return matchesSearch && matchesCategory && matchesSubcategory && matchesSize && matchesStatus;
    });
  }, [items, search, filters]);

  const deleteItem = async (id) => {
    if (confirm('Är du säker på att du vill ta bort denna artikel?')) {
      await base44.entities.ArbetskläderUtrustning.delete(id);
      refetch();
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    refetch();
  };

  const handleDownloadTemplate = () => {
    const template = [
      ['name', 'manufacturer', 'category', 'subcategory', 'size', 'quantity', 'status', 'condition', 'barcode', 'location_name', 'notes'],
      ['T-shirt', 'Bonetex', 'Arbetskläder', 'T-shirt', 'M', 5, 'i_lager', 'bra', 'BAR001', 'Lager', 'Exempel'],
    ];
    const csv = template.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'arbetskläder_mall.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToExcel = () => {
    const header = ['Namn', 'Tillverkare', 'Kategori', 'Typ', 'Storlek', 'Antal', 'Status', 'Skick', 'Streckkod', 'Plats', 'Anteckningar'];
    const rows = filteredItems.map(item => [
      item.name,
      item.manufacturer || '',
      item.category || '',
      item.subcategory || '',
      item.size || '',
      item.quantity || 0,
      item.status || '',
      item.condition || '',
      item.barcode || '',
      item.location_name || '',
      item.notes || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arbetskläder_${new Date().toLocaleDateString('sv-SE')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFromExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const fileUrl = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl.file_url,
        json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            manufacturer: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            size: { type: "string" },
            quantity: { type: "number" },
            status: { type: "string" },
            condition: { type: "string" },
            barcode: { type: "string" },
            location_name: { type: "string" },
            notes: { type: "string" },
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const itemsData = Array.isArray(result.output) ? result.output : [result.output];
        const validItems = itemsData.filter(item => item.name && item.name.trim() !== '');
        
        if (validItems.length === 0) {
          alert('Inga giltiga data hittades i filen. Kontrollera att du har fyllt i minst Namn-kolumnen.');
          return;
        }
        
        const itemsToCreate = validItems.map(item => ({
          name: item.name,
          manufacturer: item.manufacturer || '',
          category: item.category || 'Arbetskläder',
          subcategory: item.subcategory || '',
          size: item.size || '',
          quantity: item.quantity || 0,
          status: item.status || 'i_lager',
          condition: item.condition || 'bra',
          barcode: item.barcode || '',
          location_name: item.location_name || '',
          notes: item.notes || '',
        }));

        await base44.entities.ArbetskläderUtrustning.bulkCreate(itemsToCreate);
        queryClient.invalidateQueries({ queryKey: ['arbetskläder'] });
        alert(`${itemsToCreate.length} artiklar importerades!`);
      } else {
        const errorMsg = result.details || 'Okänt fel';
        alert(`Kunde inte extrahera data från filen: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Importen misslyckades: ${error.message || error}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Arbetskläder & Utrustning</h1>
            <p className="text-gray-500 mt-1">{filteredItems.length} artiklar</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={items.length === 0}
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
              onClick={() => setIsModalOpen(true)}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny artikel
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          filterOptions={{
            category: { label: 'Kategori', options: categories },
            subcategory: { label: 'Typ', options: subcategories },
            size: { label: 'Storlek', options: sizes },
            status: { label: 'Status', options: Object.keys(statusMap) },
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Items Display */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Inga artiklar hittades</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.subcategory}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kategori:</span>
                    <Badge variant="outline">{item.category}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Storlek:</span>
                    <span className="font-medium">{item.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Antal:</span>
                    <span className="font-medium">{item.quantity || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={statusMap[item.status]?.class || ''}>
                      {statusMap[item.status]?.label || item.status}
                    </Badge>
                  </div>
                  {item.location_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Plats:</span>
                      <span className="font-medium">{item.location_name}</span>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <p className="text-sm text-gray-600 border-t pt-2">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ArbetskläderUtrustningFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={editingItem}
        locations={locations}
      />
    </div>
  );
}