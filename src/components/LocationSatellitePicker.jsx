import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/ui/mobile-select';

export default function LocationSatellitePicker({
  locations = [],
  locationId,
  satelliteLocationId,
  onLocationChange,
  onSatelliteChange,
  locationLabel = 'Huvudplats *',
  satelliteLabel = 'Satellit (valfritt)',
  locationError = false,
}) {
  // Main locations = those with no parent
  const mainLocations = useMemo(
    () => locations.filter(l => !l.parent_location_id),
    [locations]
  );

  // Satellites for currently selected main location
  const satellites = useMemo(
    () => locationId ? locations.filter(l => l.parent_location_id === locationId) : [],
    [locations, locationId]
  );

  const handleMainChange = (val) => {
    const loc = locations.find(l => l.id === val);
    onLocationChange(val, loc?.name || '');
    // Clear satellite when main location changes
    onSatelliteChange('', '');
  };

  const handleSatelliteChange = (val) => {
    const loc = locations.find(l => l.id === val);
    onSatelliteChange(val, loc?.name || '');
  };

  return (
    <>
      <div className="space-y-2">
        <Label className={locationError ? 'text-red-500' : ''}>{locationLabel}</Label>
        <MobileSelect
          value={locationId || ''}
          onChange={handleMainChange}
          options={[
            { value: '', label: 'Ej tilldelad' },
            ...mainLocations.map(l => ({ value: l.id, label: l.name })),
          ]}
          placeholder="Välj huvudplats"
          className={locationError ? '!border-red-400' : ''}
        />
      </div>

      {satellites.length > 0 && (
        <div className="space-y-2">
          <Label>{satelliteLabel}</Label>
          <MobileSelect
            value={satelliteLocationId || ''}
            onChange={handleSatelliteChange}
            options={[
              { value: '', label: 'Ingen satellit' },
              ...satellites.map(l => ({ value: l.id, label: l.name })),
            ]}
            placeholder="Välj satellit"
          />
        </div>
      )}
    </>
  );
}