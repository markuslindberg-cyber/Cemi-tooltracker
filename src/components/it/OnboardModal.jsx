import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { nextITCode } from '@/lib/itConstants';
import PersonSelect from './PersonSelect';
import ITFields from './ITFields';

export default function OnboardModal({ open, onClose, items, onSaved }) {
  const [person, setPerson] = useState(null);
  const [mode, setMode] = useState('lager');
  const [picked, setPicked] = useState([]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setPerson(null); setMode('lager'); setPicked([]); setForm({ skick: 'ny' }); } }, [open]);
  const stock = items.filter(i => i.status === 'i_lager');
  const assign = { assigned_to_person_id: person?.id, assigned_to_person_name: person?.name, status: 'i_bruk' };

  const finish = async () => {
    setSaving(true);
    if (mode === 'lager') await Promise.all(picked.map(id => base44.entities.ITUtrustning.update(id, assign)));
    else await base44.entities.ITUtrustning.create({ ...form, ...assign, barcode: await nextITCode() });
    setSaving(false); onSaved(); onClose();
  };
  const valid = person && (mode === 'lager' ? picked.length : form.benamning && form.typ);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ny anställd</DialogTitle></DialogHeader>
        <div className="space-y-1"><Label>Person</Label><PersonSelect value={person?.id} onChange={setPerson} /></div>
        <div className="grid grid-cols-2 gap-2">
          {[['lager', 'Från lager'], ['ny', 'Köpa nytt']].map(([k, l]) => (
            <Button key={k} variant="outline" onClick={() => setMode(k)} className={mode === k ? 'border-[#8B1E1E] text-[#8B1E1E] bg-[#8B1E1E]/5' : ''}>{l}</Button>
          ))}
        </div>
        {mode === 'lager' ? (
          <div className="space-y-1">
            {stock.length === 0 && <p className="text-sm text-center py-6 text-gray-500">Inget i lager</p>}
            {stock.map(i => (
              <label key={i.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <Checkbox checked={picked.includes(i.id)} onCheckedChange={() => setPicked(p => p.includes(i.id) ? p.filter(x => x !== i.id) : [...p, i.id])} />
                <span className="text-sm flex-1">{i.benamning}</span><span className="text-xs font-mono text-gray-500">{i.barcode}</span>
              </label>
            ))}
          </div>
        ) : <ITFields form={form} set={(k, v) => setForm(f => ({ ...f, [k]: v }))} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button disabled={!valid || saving} onClick={finish} className="bg-[#8B1E1E] hover:bg-[#8B1E1E]/90 text-white">{saving && <Loader2 className="animate-spin" />} Tilldela</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}