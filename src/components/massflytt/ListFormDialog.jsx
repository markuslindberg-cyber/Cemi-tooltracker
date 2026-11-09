import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import LocationSatellitePicker from '@/components/LocationSatellitePicker';

const BLANK = { name: '', kind: 'move', location_id: '', location_name: '', satellite_location_id: '', satellite_location_name: '', sale_place: '', sale_date: '' };

export default function ListFormDialog({ open, onOpenChange, list, locations, onSave, onDelete }) {
  const [form, setForm] = useState(BLANK);
  useEffect(() => { if (open) setForm(list ? { ...BLANK, ...list } : { ...BLANK, sale_date: new Date().toISOString().slice(0, 10) }); }, [open, list]);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const kindBtn = (kind, Icon, label, tone) => (
    <button type="button" onClick={() => set({ kind })}
      className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all',
        form.kind === kind ? tone : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{list ? 'Redigera lista' : 'Ny lista'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {kindBtn('move', Truck, 'Flyttlista', 'border-[#8B1E1E] bg-[#8B1E1E]/5 text-[#8B1E1E]')}
            {kindBtn('sale', Tag, 'Säljlista', 'border-emerald-600 bg-emerald-50 text-emerald-700')}
          </div>
          <div className="space-y-2">
            <Label>Namn *</Label>
            <Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder={form.kind === 'move' ? 't.ex. Till förrådet' : 't.ex. Auktion november'} />
          </div>
          {form.kind === 'move' ? (
            <LocationSatellitePicker
              locations={locations}
              locationId={form.location_id}
              satelliteLocationId={form.satellite_location_id}
              locationLabel="Destination *"
              onLocationChange={(id, name) => set({ location_id: id, location_name: name })}
              onSatelliteChange={(id, name) => set({ satellite_location_id: id, satellite_location_name: name })}
            />
          ) : (
            <>
              <div className="space-y-2">
                <Label>Var säljs föremålen? *</Label>
                <Input value={form.sale_place} onChange={e => set({ sale_place: e.target.value })} placeholder="t.ex. Blocket, Klaravik" />
              </div>
              <div className="space-y-2">
                <Label>Försäljningsdatum *</Label>
                <Input type="date" value={form.sale_date} onChange={e => set({ sale_date: e.target.value })} />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {list && onDelete ? <Button variant="ghost" className="text-red-600" onClick={() => onDelete(list.id)}>Ta bort lista</Button> : <span />}
          <Button disabled={!form.name.trim()} onClick={() => onSave(form)} className="bg-[#8B1E1E] hover:bg-[#6B1515]">Spara</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}