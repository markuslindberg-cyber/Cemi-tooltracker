import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LocationFormModal from '@/components/modals/LocationFormModal';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
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
  Shovel,
  ChevronRight,
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
  const [locationToDelete, setLocationToDelete] = useState(null);

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('-created_date'),
  });

  const navigate = useNavigate();

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
  });

  const { data: handTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list(),
  });

  const filteredLocations = locations.filter(location =>
    (location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !location.parent_location_id // Only show main locations, not sub-locations
  );

  const getSubLocations = (locationId) => {
    return locations.filter(l => l.parent_location_id === locationId);
  };

  const getToolCount = (locationId) => {
    return tools.filter(t => t.location_id === locationId).length;
  };

  const getHandToolCount = (locationId) => {
    return handTools.filter(t => t.location_id === locationId).length;
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

  const handleDeleteLocation = (location) => {
    setLocationToDelete(location);
  };

  const confirmDeleteLocation = async (unassign) => {
    if (!locationToDelete) return;
    setIsLoading(true);
    if (unassign) {
      await base44.functions.invoke('unassignToolsFromEntity', { entityType: 'Location', entityId: locationToDelete.id });
    }
    await base44.entities.Location.delete(locationToDelete.id);
    queryClient.invalidateQueries(['locations']);
    queryClient.invalidateQueries(['tools']);
    queryClient.invalidateQueries(['handtools']);
    setLocationToDelete(null);
    setIsLoading(false);
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
            <h1 className="text-3xl font-bold text-gray-900">Platser</h1>
            <p className="text-gray-500 mt-1">
              {locations.length} {locations.length !== 1 ? 'platser' : 'plats'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddLocation(true)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Lägg till plats
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
              {locations.length === 0 ? 'Inga platser ännu' : 'Inga matchande platser'}
            </h3>
            <p className="text-gray-500 mb-4">
              {locations.length === 0 
                ? 'Lägg till din första plats för att organisera verktyg'
                : 'Prova ett annat sökord'}
            </p>
            {locations.length === 0 && (
              <Button
                onClick={() => setShowAddLocation(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till första platsen
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location) => {
              const type = typeConfig[location.type] || typeConfig.other;
              const Icon = type.icon;
              const toolCount = getToolCount(location.id);
              const subLocations = getSubLocations(location.id);

              return (
                <div key={location.id}>
                  <div
                    onClick={() => navigate(`/locations/${location.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
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
                          <div className="flex items-center gap-2 text-gray-500"><Package className="w-4 h-4" /><span>Maskiner</span></div>
                          <span className="font-medium text-gray-900">{toolCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-500"><Shovel className="w-4 h-4" /><span>Handredskap</span></div>
                          <span className="font-medium text-gray-900">{getHandToolCount(location.id)}</span>
                        </div>
                        {location.contacts && location.contacts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {location.contacts.map(contact => (
                              <div key={contact.id} className="text-xs">
                                {contact.is_primary && <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-1">Huvudansvarig</span>}
                                <span className="text-gray-600">{contact.name}</span>
                                {contact.phone && <span className="text-gray-500"> • {contact.phone}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {subLocations.length > 0 && (
                    <div className="mt-3 space-y-2 ml-4">
                      {subLocations.map((subLoc) => {
                        const subType = typeConfig[subLoc.type] || typeConfig.other;
                        const SubIcon = subType.icon;
                        return (
                          <div
                            key={subLoc.id}
                            onClick={() => navigate(`/locations/${subLoc.id}`)}
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer flex items-start gap-3"
                          >
                            <div className={`p-2 rounded-lg ${subType.color.split(' ')[0]} flex-shrink-0`}>
                              <SubIcon className={`w-4 h-4 ${subType.color.split(' ')[1]}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{subLoc.name}</p>
                              <p className="text-xs text-gray-500">{getToolCount(subLoc.id)} maskiner</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  <div key={location.id} onClick={() => navigate(`/locations/${location.id}`)} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
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
                      <span className="flex items-center gap-1"><Shovel className="w-4 h-4" />{getHandToolCount(location.id)}</span>
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
      <DeleteConfirmationModal
        isOpen={!!locationToDelete}
        onClose={() => setLocationToDelete(null)}
        title={`Ta bort ${locationToDelete?.name}?`}
        description={
          locationToDelete && (getToolCount(locationToDelete.id) + getHandToolCount(locationToDelete.id)) > 0
            ? `Platsen har ${getToolCount(locationToDelete.id) + getHandToolCount(locationToDelete.id)} verktyg/handredskap kopplade. Vad vill du göra med dessa?`
            : `Är du säker på att du vill ta bort ${locationToDelete?.name}? Åtgärden kan inte ångras.`
        }
        hasTools={locationToDelete ? (getToolCount(locationToDelete.id) + getHandToolCount(locationToDelete.id)) > 0 : false}
        onUnassignAndDelete={() => confirmDeleteLocation(true)}
        onDeleteOnly={() => confirmDeleteLocation(false)}
        onConfirmNoTools={() => confirmDeleteLocation(false)}
      />
    </div>
  );
}