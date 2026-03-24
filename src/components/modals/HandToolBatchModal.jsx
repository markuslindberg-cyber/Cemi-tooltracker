import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';

const defaultForm = {
  name: '',
  manufacturer: '',
  category: '',
  subcategory: '',
  condition: 'bra',
  status: 'i_lager',
  purchase_date: '',
  purchase_price: '',
  image_url: '',
  notes: '',
};

export default function HandToolBatchModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(defaultForm);
  const [quantity, setQuantity] = useState(1);
  const [distributions, setDistributions] = useState([{ location_id: '', location_name: '', count: 1 }]);
  const [saving, setSaving] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
    enabled: isOpen,
  });

  const { data: allHandTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 200),
    enabled: isOpen,
  });

  const availableCategories = [...new Set(allHandTools.map(t => t.category).filter(Boolean))].sort();

  useEffect(() => {
    if (!isOpen) {
      setForm(defaultForm);
      setQuantity(1);
      setDistributions([{ location_id: '', location_name: '', count: 1 }]);
    }
  }, [isOpen]);

  const totalDistributed = distributions.reduce((s, d) => s + (parseInt(d.count) || 0), 0);

  const handleAddRow = () => {
    setDistributions(prev => [...prev, { location_id: '', location_name: '', count: 1 }]);
  };

  const handleRemoveRow = (i) => {
    setDistributions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleDistChange = (i, field, value) => {
    setDistributions(prev => prev.map((d, idx) => {
      if (idx !== i) return d;
      if (field === 'location_id') {
        const loc = locations.find(l => l.id === value);
        return { ...d, location_id: value, location_name: loc?.name || '' };
      }
      return { ...d, [field]: value };
    }));
  };

  const handleSubmit = async () => {
    if (totalDistributed !== quantity) return;
    setSaving(true);
    const records = [];
    for (const dist of distributions) {
      const count = parseInt(dist.count) || 0;
      for (let i = 0; i < count; i++) {
        records.push({
          name: form.name,
          manufacturer: form.manufacturer,
          category: form.category,
          subcategory: form.subcategory,
          condition: form.condition,
          status: form.status || 'i_lager',
          notes: form.notes,
          image_url: form.image_url || undefined,
          purchase_date: form.purchase_date || undefined,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
          location_id: dist.location_id || undefined,
          location_name: dist.location_name || undefined,
        });
      }
    }
    await base44.entities.HandTool.bulkCreate(records);
    setSaving(false);
    onSuccess?.();
    onClose();
  };

  const isValid = form.name && form.category && totalDistributed === quantity && quantity > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Lägg till handredskap</DialogTitle>
        </DialogHeader>

        {/* Template picker */}
        {allHandTools.length > 0 && (
          <div className="space-y-1">
            <Label className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Använd befintligt redskap som mall</Label>
            <Select onValueChange={id => {
              const t = allHandTools.find(x => x.id === id);
              if (t) setForm({
                name: t.name || '',
                manufacturer: t.manufacturer || '',
                category: t.category || '',
                subcategory: t.subcategory || '',
                condition: t.condition || 'bra',
                status: t.status || 'i_lager',
                purchase_date: t.purchase_date || '',
                purchase_price: t.purchase_price ? String(t.purchase_price) : '',
                image_url: t.image_url || '',
                notes: t.notes || '',
              });
            }}>
              <SelectTrigger><SelectValue placeholder="Välj mall (valfritt)" /></SelectTrigger>
              <SelectContent>
                {[...new Map(allHandTools.map(t => [t.name, t])).values()].map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} {t.category ? `(${t.category})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Namn *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="t.ex. Räfsa, Spade..."
                list="ht-name-suggestions"
              />
              <datalist id="ht-name-suggestions">
                {[...new Set(allHandTools.map(t => t.name).filter(Boolean))].map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Tillverkare</Label>
              <Input
                value={form.manufacturer}
                onChange={e => setForm(p => ({ ...p, manufacturer: e.target.value }))}
                placeholder="t.ex. Fiskars"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Kategori *</Label>
              <Input
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="t.ex. Räfsor, Spadar..."
                list="ht-category-suggestions"
              />
              <datalist id="ht-category-suggestions">
                {availableCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Underkategori</Label>
              <Input
                value={form.subcategory}
                onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                placeholder="Valfritt"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <Label>Antal att lägga till *</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>

          {/* Distribution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fördela på platser</Label>
              <span className={`text-sm font-medium ${totalDistributed === quantity ? 'text-green-600' : 'text-red-500'}`}>
                {totalDistributed} / {quantity} fördelade
              </span>
            </div>

            {distributions.map((dist, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="flex-1">
                  <Select value={dist.location_id} onValueChange={v => handleDistChange(i, 'location_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Välj plats" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Ingen plats</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={dist.count}
                  onChange={e => handleDistChange(i, 'count', e.target.value)}
                  className="w-20"
                />
                {distributions.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(i)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={handleAddRow} className="gap-1">
              <Plus className="w-4 h-4" />
              Lägg till plats
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : `Lägg till ${quantity} st`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}