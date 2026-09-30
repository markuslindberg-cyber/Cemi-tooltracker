import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { IT_STATUS, nextITCode } from '@/lib/itConstants';
import ITFields from './ITFields';
import PersonSelect from './PersonSelect';

export default function ITFormModal({ open, onClose, item, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(item || { status: 'i_lager', skick: 'ny' }); }, [open, item]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by_id, ...data } = form;
    if (item) await base44.entities.ITUtrustning.update(item.id, data);
    else await base44.entities.ITUtrustning.create({ ...data, barcode: await nextITCode() });
    setSaving(false); onSaved(); onClose();
  };
  const remove = async () => {
    if (!confirm('Flytta till papperskorgen?')) return;
    await base44.entities.ITUtrustning.update(item.id, { is_deleted: true, deleted_at: new Date().toISOString() });
    onSaved(); onClose();
  };
  const setPerson = (p) => setForm(f => ({ ...f, assigned_to_person_id: p?.id || null, assigned_to_person_name: p?.name || null, status: p ? 'i_bruk' : (f.status === 'i_bruk' ? 'i_lager' : f.status) }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? `${item.benamning} (${item.barcode || ''})` : 'Registrera IT-utrustning'}</DialogTitle></DialogHeader>
        <ITFields form={form} set={set} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(IT_STATUS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label>Skick</Label>
            <Select value={form.skick} onValueChange={v => set('skick', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['ny', 'bra', 'okej', 'dålig'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label>Tilldelad</Label><PersonSelect value={form.assigned_to_person_id} onChange={setPerson} allowNone /></div>
        </div>
        <DialogFooter className="gap-2">
          {item && <Button variant="outline" className="text-red-600 mr-auto" onClick={remove}><Trash2 /> Ta bort</Button>}
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button disabled={saving || !form.benamning || !form.typ} onClick={save} className="bg-[#8B1E1E] hover:bg-[#8B1E1E]/90 text-white">
            {saving && <Loader2 className="animate-spin" />} Spara
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}