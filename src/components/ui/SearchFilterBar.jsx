import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, Grid, List, X } from "lucide-react";
import { cn } from "@/lib/utils";

function FilterSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-1">{children}</div>}
    </div>
  );
}

function FilterOption({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
        selected ? "bg-[#8B1E1E]/10 text-[#8B1E1E] font-medium" : "text-gray-700 hover:bg-gray-100"
      )}
    >
      <span className={cn(
        "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
        selected ? "bg-[#8B1E1E] border-[#8B1E1E]" : "border-gray-300"
      )}>
        {selected && <span className="w-2 h-2 bg-white rounded-sm block" />}
      </span>
      {label}
    </button>
  );
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  subcategoryFilter,
  onSubcategoryChange,
  manufacturerFilter,
  onManufacturerChange,
  conditionFilter,
  onConditionChange,
  locationFilter,
  onLocationChange,
  assignedToFilter,
  onAssignedToChange,
  viewMode,
  onViewModeChange,
  onClearFilters,
  showViewToggle = true,
  availableSubcategories = [],
  availableManufacturers = [],
  availableLocations = [],
  availableAssignedTo = [],
  availableCategories = [],
  sortBy,
  onSortByChange,
  statusOptions: customStatusOptions,
  conditionOptions: customConditionOptions,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeCount = [
    statusFilter?.length > 0 ? 1 : 0,
    categoryFilter && categoryFilter !== 'all' ? 1 : 0,
    subcategoryFilter && subcategoryFilter !== 'all' ? 1 : 0,
    manufacturerFilter && manufacturerFilter !== 'all' ? 1 : 0,
    conditionFilter && conditionFilter !== 'all' ? 1 : 0,
    locationFilter && locationFilter !== 'all' ? 1 : 0,
    assignedToFilter && assignedToFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const statusOptions = customStatusOptions || [
    { value: 'available', label: 'Tillgänglig' },
    { value: 'in_use', label: 'I bruk' },
    { value: 'i_lager', label: 'I lager' },
    { value: 'maintenance', label: 'Underhåll' },
    { value: 'missing', label: 'Saknas' },
    { value: 'retired', label: 'Kasserad' },
  ];

  const conditionOptions = customConditionOptions || [
    { value: 'new', label: 'Ny' },
    { value: 'good', label: 'Bra' },
    { value: 'fair', label: 'Okej' },
    { value: 'poor', label: 'Dålig' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter button */}
        <div className="relative" ref={ref}>
          <Button
            variant="outline"
            onClick={() => setOpen(!open)}
            className={cn("h-11 gap-2 border-gray-200", activeCount > 0 && "border-[#8B1E1E]/40 text-[#8B1E1E]")}
          >
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#8B1E1E] text-white text-xs flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
            <SlidersHorizontal className="w-4 h-4" />
            Filtrera
            <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
          </Button>

          {open && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[500px] overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Filtrera efter:</span>
                {activeCount > 0 && (
                  <button
                    onClick={() => {
                      onStatusChange([]);
                      onCategoryChange('all');
                      onSubcategoryChange('all');
                      onManufacturerChange('all');
                      onConditionChange('all');
                      onLocationChange('all');
                      if (onAssignedToChange) onAssignedToChange('all');
                      setOpen(false);
                    }}
                    className="text-xs text-[#8B1E1E] hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </div>

              <FilterSection title="Status" defaultOpen={statusFilter.length > 0}>
                <FilterOption label="Alla" selected={statusFilter.length === 0} onClick={() => onStatusChange([])} />
                {statusOptions.map(opt => (
                  <FilterOption 
                    key={opt.value} 
                    label={opt.label} 
                    selected={statusFilter.includes(opt.value)} 
                    onClick={() => {
                      const newFilter = statusFilter.includes(opt.value)
                        ? statusFilter.filter(v => v !== opt.value)
                        : [...statusFilter, opt.value];
                      onStatusChange(newFilter);
                    }} 
                  />
                ))}
              </FilterSection>

              {availableCategories.length > 0 && (
                <FilterSection title="Kategori" defaultOpen={categoryFilter !== 'all'}>
                  <FilterOption label="Alla kategorier" selected={categoryFilter === 'all'} onClick={() => onCategoryChange('all')} />
                  {availableCategories.map(cat => (
                    <FilterOption key={cat} label={cat} selected={categoryFilter === cat} onClick={() => onCategoryChange(cat)} />
                  ))}
                </FilterSection>
              )}

              {availableSubcategories.length > 0 && (
                <FilterSection title="Underkategori" defaultOpen={subcategoryFilter !== 'all'}>
                  <FilterOption label="Alla underkategorier" selected={subcategoryFilter === 'all'} onClick={() => onSubcategoryChange('all')} />
                  {availableSubcategories.map(sub => (
                    <FilterOption key={sub} label={sub} selected={subcategoryFilter === sub} onClick={() => onSubcategoryChange(sub)} />
                  ))}
                </FilterSection>
              )}

              {availableLocations.length > 0 && (
                <FilterSection title="Plats" defaultOpen={locationFilter !== 'all'}>
                  <FilterOption label="Alla platser" selected={locationFilter === 'all'} onClick={() => onLocationChange('all')} />
                  {availableLocations.map(loc => (
                    <FilterOption key={loc} label={loc} selected={locationFilter === loc} onClick={() => onLocationChange(loc)} />
                  ))}
                </FilterSection>
              )}

              {availableAssignedTo.length > 0 && (
                <FilterSection title="Tilldelad" defaultOpen={assignedToFilter !== 'all'}>
                  <FilterOption label="Alla" selected={assignedToFilter === 'all'} onClick={() => onAssignedToChange('all')} />
                  <FilterOption label="Ej tilldelad" selected={assignedToFilter === 'unassigned'} onClick={() => onAssignedToChange('unassigned')} />
                  {availableAssignedTo.map(person => (
                    <FilterOption key={person} label={person} selected={assignedToFilter === person} onClick={() => onAssignedToChange(person)} />
                  ))}
                </FilterSection>
              )}

              {availableManufacturers.length > 0 && (
                <FilterSection title="Tillverkare" defaultOpen={manufacturerFilter !== 'all'}>
                  <FilterOption label="Alla tillverkare" selected={manufacturerFilter === 'all'} onClick={() => onManufacturerChange('all')} />
                  {availableManufacturers.map(mfr => (
                    <FilterOption key={mfr} label={mfr} selected={manufacturerFilter === mfr} onClick={() => onManufacturerChange(mfr)} />
                  ))}
                </FilterSection>
              )}

              {conditionFilter !== undefined && (
                <FilterSection title="Skick" defaultOpen={conditionFilter !== 'all'}>
                  <FilterOption label="Alla skick" selected={conditionFilter === 'all'} onClick={() => onConditionChange('all')} />
                  {conditionOptions.map(opt => (
                    <FilterOption key={opt.value} label={opt.label} selected={conditionFilter === opt.value} onClick={() => onConditionChange(opt.value)} />
                  ))}
                </FilterSection>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Sök verktyg..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-11 border-gray-200 focus:border-[#8B1E1E]/30"
          />
        </div>

        {/* Sort */}
        {sortBy !== undefined && onSortByChange && (
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[170px] h-11 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Senast uppdaterad</SelectItem>
              <SelectItem value="last_checked">Senast kontrollerad</SelectItem>
              <SelectItem value="name">Namn (A-Ö)</SelectItem>
              <SelectItem value="category">Kategori</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* View toggle */}
        {showViewToggle && (
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('grid')}
              className={`h-11 w-11 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('list')}
              className={`h-11 w-11 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}