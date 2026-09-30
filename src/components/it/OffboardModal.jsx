import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import PersonSelect from './PersonSelect';

export default function OffboardModal({ open, onClose, items, onSaved }) {
  const [person, setPerson] = useState(null);
  const [scanned, setScanned] = useState([]);
  const [code, setCode] = useState('');
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setPerson(null); setScanned([]); setTargets({}); } }, [open]);
  const assigned = person ? items.filter(i => i.assigned_to_person_id === person.id) : [];

  const scan = (e) => {
    e.preventDefault();
    const hit = assigned.find(i => [i.barcode, i.serienummer].includes(code.trim()));
    if (hit && !scanned.includes(hit.id)) setScanned(s => [...s, hit.id]);
    else if (!hit) alert('Koden tillhör inte denna person');
    setCode('');
  };
  const toggle = (id) => setScanned(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const finish = async () => {
    setSaving(true);
    await Promise.all(assigned.map(i => {
      if (!scanned.includes(i.id)) return base44.entities.ITUtrustning.update(i.id, { status: 'saknas' });
      const t = targets[i.id];
      return base44.entities.ITUtrustning.update(i.id, t
        ? { assigned_to_person_id: t.id, assigned_to_person_name: t.name, status: 'i_bruk' }
        : { assigned_to_person_id: null, assigned_to_person_name: null, status: 'i_lager' });
    }));
    setSaving(false); onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Avsluta person</DialogTitle></DialogHeader>
        <div className="space-y-1"><Label>Person</Label><PersonSelect value={person?.id} onChange={p => { setPerson(p); setScanned([]); }} /></div>
        {person && (<>
          <form onSubmit={scan}><Input autoFocus placeholder="Skanna eller skriv kod / serienummer och tryck Enter" value={code} onChange={e => setCode(e.target.value)} className="text-base" /></form>
          <p className="text-sm text-gray-500">{scanned.length} av {assigned.length} återlämnade</p>
          {assigned.length === 0 && <p className="text-sm text-center py-6 text-gray-500">Personen har ingen tilldelad IT-utrustning</p>}
          <div className="space-y-2">
            {assigned.map(i => {
              const ok = scanned.includes(i.id);
              return (
                <div key={i.id} className={`rounded-xl border p-3 space-y-2 ${ok ? 'border-green-300 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'}`}>
                  <button type="button" onClick={() => toggle(i.id)} className="flex items-center gap-2 w-full text-left">
                    {ok ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-400" />}
                    <span className="font-medium text-sm flex-1">{i.benamning}</span>
                    <span className="text-xs font-mono text-gray-500">{i.barcode}</span>
                  </button>
                  {ok && <div className="flex items-center gap-2 text-sm"><span className="shrink-0 text-gray-600">Till:</span>
                    <div className="flex-1"><PersonSelect allowNone value={targets[i.id]?.id} onChange={p => setTargets(t => ({ ...t, [i.id]: p }))} /></div></div>}
                </div>
              );
            })}
          </div>
          {assigned.length > scanned.length && <p className="text-xs text-red-600">Utrustning som inte bockats av markeras som saknad.</p>}
        </>)}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button disabled={!person || !assigned.length || saving} onClick={finish} className="bg-[#8B1E1E] hover:bg-[#8B1E1E]/90 text-white">{saving && <Loader2 className="animate-spin" />} Slutför</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}