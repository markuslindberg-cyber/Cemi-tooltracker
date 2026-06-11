import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function NyttInköpModal({ open, onClose, artiklar = [] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    artikel_id: '',
    antal: '',
    pris: '',
    datum: new Date().toISOString().split('T')[0],
  });

  const activeArtiklar = artiklar.filter(a => !a.is_deleted);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LokalvardInköp.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardInkop']);
      setForm({ artikel_id: '', antal: '', pris: '', datum: new Date().toISOString().split('T')[0] });
      onClose();
    },
  });

  const selectedArtikel = activeArtiklar.find(a => a.id === form.artikel_id || a.streckkod === form.artikel_id);

  const handleArtikelChange = (value) => {
    const artikel = activeArtiklar.find(a => a.id === value);
    setForm(prev => ({
      ...prev,
      artikel_id: value,
      pris: artikel?.pris?.toString() || prev.pris,
    }));
  };

  const handleSave = () => {
    const antal = parseFloat(form.antal);
    const pris = parseFloat(form.pris);
    if (!form.artikel_id || !antal || !pris || !form.datum) return;

    createMutation.mutate({
      artikel_id: form.artikel_id,
      datum: form.datum,
      antal,
      pris,
    });
  };

  const totalKostnad = (parseFloat(form.antal) || 0) * (parseFloat(form.pris) || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nytt inköp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Artikel</Label>
            <Select value={form.artikel_id} onValueChange={handleArtikelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Välj artikel..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {activeArtiklar
                  .sort((a, b) => a.benamning.localeCompare(b.benamning, 'sv'))
                  .map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.benamning} ({a.streckkod})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Antal</Label>
              <Input
                type="number"
                min="1"
                value={form.antal}
                onChange={e => setForm(prev => ({ ...prev, antal: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Pris per enhet (kr)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.pris}
                onChange={e => setForm(prev => ({ ...prev, pris: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label>Datum</Label>
            <Input
              type="date"
              value={form.datum}
              onChange={e => setForm(prev => ({ ...prev, datum: e.target.value }))}
            />
          </div>

          {totalKostnad > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
              <span className="text-blue-700">Totalkostnad: </span>
              <span className="font-bold text-blue-900">
                {totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
            <Button
              onClick={handleSave}
              disabled={!form.artikel_id || !form.antal || !form.pris || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Spara inköp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}