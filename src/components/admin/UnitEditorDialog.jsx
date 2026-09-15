import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { MENU_GROUPS, ALL_MENU_IDS } from '@/lib/unitMenus';

export default function UnitEditorDialog({ open, onOpenChange, unit, menus, onSave, isSaving }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selected, setSelected] = useState(ALL_MENU_IDS);

  useEffect(() => {
    if (!open) return;
    setName(unit?.name || '');
    setDescription(unit?.description || '');
    setIsActive(unit?.is_active !== false);
    setSelected(menus || ALL_MENU_IDS);
  }, [open, unit, menus]);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      menus: selected,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unit ? 'Redigera enhet' : 'Lägg till enhet'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Namn <span className="text-[#8B1E1E]">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="t.ex. Utemiljö" />
          </div>

          <div className="space-y-1.5">
            <Label>Beskrivning</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Kort beskrivning (valfritt)" />
          </div>

          {unit && (
            <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] dark:border-gray-800 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Aktiv</p>
                <p className="text-xs text-gray-500">Inaktiva enheter döljs i enhetsväljaren</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Synliga huvudmenyer</p>
            <div className="border border-[#E2E8F0] dark:border-gray-800 rounded-2xl overflow-hidden">
              {MENU_GROUPS.map((g, i) => (
                <label
                  key={g.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}
                >
                  <span className="text-sm font-medium">{g.label}</span>
                  <Checkbox checked={selected.includes(g.id)} onCheckedChange={() => toggle(g.id)} />
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Rollbaserad behörighet gäller fortfarande utöver detta.</p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ångra</Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="bg-[#8B1E1E] hover:bg-[#731818]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Spara
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}