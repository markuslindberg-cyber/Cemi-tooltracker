import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function HandToolEditModal({ isOpen, onClose, tool, locations, onSuccess }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tool) setForm({ ...tool });
  }, [tool]);

  const handleChange = (field, value) => {
    if (field === 'location_id') {
      const loc = locations?.find(l => l.id === value);
      setForm(p => ({ ...p, location_id: value, location_name: loc?.name || '' }));
    } else {
      setForm(p => ({ ...p, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.HandTool.update(tool.id, form);
    setSaving(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redigera redskap</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Namn</Label>
              <Input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tillverkare</Label>
              <Input value={form.manufacturer || ''} onChange={e => handleChange('manufacturer', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Input value={form.category || ''} onChange={e => handleChange('category', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Underkategori</Label>
              <Input value={form.subcategory || ''} onChange={e => handleChange('subcategory', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_lager">I lager</SelectItem>
                  <SelectItem value="i_bruk">I bruk</SelectItem>
                  <SelectItem value="saknas">Saknas</SelectItem>
                  <SelectItem value="kasserad">Kasserad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Skick</Label>
              <Select value={form.condition} onValueChange={v => handleChange('condition', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ny">Ny</SelectItem>
                  <SelectItem value="bra">Bra</SelectItem>
                  <SelectItem value="okej">Okej</SelectItem>
                  <SelectItem value="dålig">Dålig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Plats</Label>
            <Select value={form.location_id || ''} onValueChange={v => handleChange('location_id', v)}>
              <SelectTrigger><SelectValue placeholder="Välj plats" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Ingen plats</SelectItem>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Anteckningar</Label>
            <Textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : 'Spara ändringar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}