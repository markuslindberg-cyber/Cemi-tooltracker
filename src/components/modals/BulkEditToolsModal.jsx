import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Tillgänglig' },
  { value: 'in_use', label: 'I bruk' },
  { value: 'i_lager', label: 'I lager' },
  { value: 'maintenance', label: 'Underhåll' },
  { value: 'missing', label: 'Saknas' },
];

export default function BulkEditToolsModal({ isOpen, onClose, selectedCount, locations, categories, onSubmit }) {
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setStatus('');
    setLocationId('');
    setCategory('');
    onClose();
  };

  const handleSubmit = async () => {
    const updates = {};
    if (status) updates.status = status;
    if (locationId) {
      const loc = locations.find(l => l.id === locationId);
      updates.location_id = locationId;
      updates.location_name = loc?.name || '';
    }
    if (category) updates.category = category;

    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    await onSubmit(updates);
    setSaving(false);
    handleClose();
  };

  const hasChanges = status || locationId || category;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Massredigera {selectedCount} maskiner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">Välj vad du vill uppdatera. Tomma fält lämnas oförändrade.</p>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plats</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Avbryt</Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || saving}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : `Uppdatera ${selectedCount} maskiner`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}