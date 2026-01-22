import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X, Grid, List } from "lucide-react";

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
}) {
  const hasFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || subcategoryFilter !== 'all' || manufacturerFilter !== 'all' || conditionFilter !== 'all' || locationFilter !== 'all' || assignedToFilter !== 'all';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search tools by name, model, or barcode..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 border-gray-200 focus:border-[#8B1E1E]/30 focus:ring-[#8B1E1E]/20"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px] h-11 border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[160px] h-11 border-gray-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="power_tools">Power Tools</SelectItem>
              <SelectItem value="hand_tools">Hand Tools</SelectItem>
              <SelectItem value="measuring">Measuring</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
              <SelectItem value="heavy_equipment">Heavy Equipment</SelectItem>
              <SelectItem value="vehicles">Vehicles</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {availableSubcategories.length > 0 && (
            <Select value={subcategoryFilter} onValueChange={onSubcategoryChange}>
              <SelectTrigger className="w-[160px] h-11 border-gray-200">
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {availableSubcategories.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {availableManufacturers?.length > 0 && (
            <Select value={manufacturerFilter} onValueChange={onManufacturerChange}>
              <SelectTrigger className="w-[160px] h-11 border-gray-200">
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {availableManufacturers.map((mfr) => (
                  <SelectItem key={mfr} value={mfr}>
                    {mfr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {conditionFilter !== undefined && (
            <Select value={conditionFilter} onValueChange={onConditionChange}>
              <SelectTrigger className="w-[140px] h-11 border-gray-200">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          )}

          {availableLocations?.length > 0 && (
            <Select value={locationFilter} onValueChange={onLocationChange}>
              <SelectTrigger className="w-[160px] h-11 border-gray-200">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {availableLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {availableAssignedTo?.length > 0 && (
            <Select value={assignedToFilter} onValueChange={onAssignedToChange}>
              <SelectTrigger className="w-[160px] h-11 border-gray-200">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {availableAssignedTo.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearFilters}
              className="h-11 w-11 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          )}

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
    </div>
  );
}