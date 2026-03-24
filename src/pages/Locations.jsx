import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LocationFormModal from '@/components/modals/LocationFormModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MapPin,
  Building2,
  Truck,
  Warehouse,
  Briefcase,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Phone,
  User,
  Grid,
  List,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const typeConfig = {
  jobsite: { icon: Building2, color: 'bg-blue-100 text-blue-700' },
  warehouse: { icon: Warehouse, color: 'bg-purple-100 text-purple-700' },
  office: { icon: Briefcase, color: 'bg-emerald-100 text-emerald-700' },
  vehicle: { icon: Truck, color: 'bg-amber-100 text-amber-700' },
  other: { icon: MapPin, color: 'bg-gray-100 text-gray-700' },
};

export default function Locations() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editLocation, setEditLocation] = useState(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('-created_date'),
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
  });

  const filteredLocations = locations.filter(location =>
    location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getToolCount = (locationId) => {
    return tools.filter(t => t.location_id === locationId).length;
  };

  const handleSaveLocation = async (locationData) => {
    setIsLoading(true);
    if (editLocation?.id) {
      await base44.entities.Location.update(editLocation.id, locationData);
    } else {
      await base44.entities.Location.create(locationData);
    }
    queryClient.invalidateQueries(['locations']);
    setEditLocation(null);
    setShowAddLocation(false);
    setIsLoading(false);
  };

  const handleDeleteLocation = async (location) => {
    const toolCount = getToolCount(location.id);
    if (toolCount > 0) {
      alert(`Cannot delete "${location.name}" - it has ${toolCount} tool(s) assigned. Reassign tools first.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${location.name}"?`)) {
      await base44.entities.Location.delete(location.id);
      queryClient.invalidateQueries(['locations']);
    }
  };

  if (loadingLocations) {
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
            <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
            <p className="text-gray-500 mt-1">
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => setShowAddLocation(true)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Location
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Sök platser..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200"
              />
            </div>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`h-11 w-11 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><Grid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`h-11 w-11 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><List className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Locations */}
        {filteredLocations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {locations.length === 0 ? 'No locations yet' : 'No matching locations'}
            </h3>
            <p className="text-gray-500 mb-4">
              {locations.length === 0 
                ? 'Add your first location to organize tools'
                : 'Try a different search term'}
            </p>
            {locations.length === 0 && (
              <Button
                onClick={() => setShowAddLocation(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Location
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location) => {
              const type = typeConfig[location.type] || typeConfig.other;
              const Icon = type.icon;
              const toolCount = getToolCount(location.id);

              return (
                <div
                  key={location.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${type.color.split(' ')[0]}`}>
                        <Icon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {!location.is_active && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inaktiv</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setEditLocation(location)}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteLocation(location)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{location.name}</h3>
                    <Badge className={`${type.color} border-0 text-xs`}>{location.type?.replace('_', ' ')}</Badge>
                    {location.address && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{location.address}</p>}
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-500"><Package className="w-4 h-4" /><span>Verktyg</span></div>
                        <span className="font-medium text-gray-900">{toolCount}</span>
                      </div>
                      {location.contact_person && <div className="flex items-center gap-2 text-sm text-gray-500"><User className="w-4 h-4" /><span>{location.contact_person}</span></div>}
                      {location.contact_phone && <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="w-4 h-4" /><span>{location.contact_phone}</span></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredLocations.map((location) => {
                const type = typeConfig[location.type] || typeConfig.other;
                const Icon = type.icon;
                const toolCount = getToolCount(location.id);
                return (
                  <div key={location.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                      <Icon className={`w-5 h-5 ${type.color.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{location.name}</p>
                        {!location.is_active && <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inaktiv</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{location.address || location.type}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      {location.contact_person && <span className="hidden sm:block">{location.contact_person}</span>}
                      <span className="flex items-center gap-1"><Package className="w-4 h-4" />{toolCount}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setEditLocation(location)}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteLocation(location)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <LocationFormModal
        isOpen={showAddLocation || !!editLocation}
        onClose={() => {
          setShowAddLocation(false);
          setEditLocation(null);
        }}
        location={editLocation}
        onSubmit={handleSaveLocation}
        isLoading={isLoading}
      />
    </div>
  );
}