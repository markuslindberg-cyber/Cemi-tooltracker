import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const PREDEFINED_CATEGORIES = {
  'Spadar': ['Rakspad', 'Rundad', 'Fyrkantig'],
  'Räfsor': ['Järnräfsa', 'Träräfsa', 'Bamburäfsa'],
  'Krattor': ['Metallkratta', 'Plast-kratta', 'Bambu-kratta'],
  'Sagar': ['Handsåg', 'Bågså', 'Nippelkätting'],
  'Hammrar': ['Klumhugg', 'Gummihammer', 'Slägga'],
  'Skufflar': ['Järnskuffel', 'Träskuffel', 'Plast-skuffel'],
  'Banor': ['Järnbana', 'Träbana'],
  'Avspärrningsmaterial': ['Farthinder', 'Skyltar', 'Kravallstaketet', 'Koner', 'Markeringsskärmar'],
};

export default function HandToolGroupEditModal({ isOpen, onClose, group, onSuccess }) {
  const isCategoryWide = group?._isCategoryWide;
  const [form, setForm] = useState({
    name: group?.name || '',
    manufacturer: group?.manufacturer || '',
    category: group?.category || '',
    subcategory: group?.items?.[0]?.subcategory || '',
    barcode: group?.items?.[0]?.barcode || '',
    location_id: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: allHandTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 200),
    enabled: isOpen,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
    enabled: isOpen,
  });

  const availableCategories = [...new Set([
    ...Object.keys(PREDEFINED_CATEGORIES),
    ...allHandTools.map(t => t.category).filter(Boolean),
  ])].sort();

  const availableSubcategories = [...new Set([
    ...(PREDEFINED_CATEGORIES[form.category] || []),
    ...allHandTools.filter(t => t.category === form.category).map(t => t.subcategory).filter(Boolean),
  ])].sort();

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim(),
      category: form.category.trim(),
      subcategory: form.subcategory.trim(),
      barcode: form.barcode.trim(),
    };
    if (form.location_id) {
      const loc = locations.find(l => l.id === form.location_id);
      updates.location_id = form.location_id;
      updates.location_name = loc?.name || '';
    }
    await Promise.all(group.items.map(item => base44.entities.HandTool.update(item.id, updates)));
    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isCategoryWide ? `Redigera alla ${group?.category}` : `Redigera grupp – ${group?.name}`}</DialogTitle>
          <p className="text-sm text-gray-500">{group?.items?.length} redskap kommer uppdateras</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Namn</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Tillverkare</Label>
            <Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} list="grp-category-suggestions" />
            <datalist id="grp-category-suggestions">
              {availableCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Underkategori</Label>
            <Input value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} list="grp-subcategory-suggestions" />
            <datalist id="grp-subcategory-suggestions">
              {availableSubcategories.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Streckkod</Label>
            <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Ändra plats för alla</Label>
            <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Välj ny plats (valfritt)" /></SelectTrigger>
              <SelectContent>
                {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.location_id && (
              <button onClick={() => setForm(f => ({ ...f, location_id: '' }))} className="text-xs text-gray-400 hover:text-gray-600">Rensa platsval</button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Sparar...</> : `Uppdatera ${group?.items?.length} redskap`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}