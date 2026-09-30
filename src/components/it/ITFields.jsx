import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IT_TYPES } from '@/lib/itConstants';

const F = ({ label, children }) => <div className="space-y-1"><Label>{label}</Label>{children}</div>;

export default function ITFields({ form, set }) {
  const inp = (k, type = 'text') => <Input type={type} value={form[k] ?? ''} onChange={e => set(k, type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <F label="Benämning *">{inp('benamning')}</F>
      <F label="Typ *">
        <Select value={form.typ || ''} onValueChange={v => set('typ', v)}>
          <SelectTrigger><SelectValue placeholder="Välj typ" /></SelectTrigger>
          <SelectContent>{IT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </F>
      <F label="Tillverkare">{inp('tillverkare')}</F>
      <F label="Modell">{inp('modell')}</F>
      <F label="Serienummer">{inp('serienummer')}</F>
      <F label="Inköpsställe">{inp('inkopsstalle')}</F>
      <F label="Fakturanummer">{inp('fakturanummer')}</F>
      <F label="Inköpsdatum">{inp('inkopsdatum', 'date')}</F>
      <F label="Inköpspris (kr)">{inp('inkopspris', 'number')}</F>
      <F label="Garanti till">{inp('garanti_till', 'date')}</F>
      {form.typ === 'mobiltelefon' && <><F label="IMEI">{inp('imei')}</F><F label="Telefonnummer">{inp('telefonnummer')}</F></>}
      <div className="sm:col-span-2"><F label="Anteckningar">{inp('notes')}</F></div>
    </div>
  );
}