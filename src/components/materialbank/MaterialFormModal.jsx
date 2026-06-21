import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import MaterialHistorik from '@/components/materialbank/MaterialHistorik';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const EMPTY_FORM = {
  benamning: '', kategori: '', underkategori: '', material_typ: '',
  tillverkare: '', matt: '', antal: '', enhet: 'st', status: 'i_lager',
  syfte: 'internt', inkopspris: '', forsaljningspris_manuell: '',
  inkopsdatum: '', inkopt_fran: '', artikelnummer: '', levfaktura_nummer: '',
  ordernummer: '', kund_namn: '', location_id: '', location_name: '',
  image_url: '', notes: '',
};

export default function MaterialFormModal({ isOpen, onClose, material, locations = [], onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (material) {
        setForm({
          ...EMPTY_FORM,
          ...material,
          antal: material.antal?.toString() || '',
          inkopspris: material.inkopspris?.toString() || '',
          forsaljningspris_manuell: material.forsaljningspris_manuell?.toString() || '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [isOpen, material]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleLocationChange = (locId) => {
    const loc = locations.find(l => l.id === locId);
    setForm(prev => ({ ...prev, location_id: locId, location_name: loc?.name || '' }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('image_url', file_url);
    } catch (err) {
      toast({ title: 'Fel vid uppladdning', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const calcForsaljningspris = () => {
    if (form.forsaljningspris_manuell) return parseFloat(form.forsaljningspris_manuell);
    const pris = parseFloat(form.inkopspris);
    return pris ? Math.round(pris * 1.3 * 100) / 100 : 0;
  };

  const handleSubmit = async () => {
    if (!form.benamning || !form.kategori || !form.antal || !form.inkopspris || !form.artikelnummer) {
      toast({ title: 'Obligatoriska fält saknas', description: 'Fyll i benämning, kategori, antal, inköpspris och artikelnummer.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        antal: parseFloat(form.antal) || 0,
        inkopspris: parseFloat(form.inkopspris) || 0,
        forsaljningspris_manuell: form.forsaljningspris_manuell ? parseFloat(form.forsaljningspris_manuell) : null,
      });
      onClose();
    } catch (err) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? 'Redigera material' : 'Registrera nytt material'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Bild */}
          <div className="flex items-center gap-4">
            {form.image_url ? (
              <div className="relative">
                <img src={form.image_url} alt="Material" className="w-24 h-24 rounded-xl object-cover" />
                <button onClick={() => set('image_url', '')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                {uploading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : (
                  <>
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Ladda upp</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* Grundinfo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Benämning *</Label>
              <Input value={form.benamning} onChange={e => set('benamning', e.target.value)} placeholder="T.ex. Markplattor grå" />
            </div>
            <div>
              <Label>Artikelnummer / Streckkod *</Label>
              <Input value={form.artikelnummer} onChange={e => set('artikelnummer', e.target.value)} />
            </div>
            <div>
              <Label>Kategori *</Label>
              <Input value={form.kategori} onChange={e => set('kategori', e.target.value)} placeholder="T.ex. Plattor, Sten, Trä" />
            </div>
            <div>
              <Label>Underkategori</Label>
              <Input value={form.underkategori} onChange={e => set('underkategori', e.target.value)} />
            </div>
            <div>
              <Label>Materialtyp</Label>
              <Input value={form.material_typ} onChange={e => set('material_typ', e.target.value)} placeholder="T.ex. Betong, Granit" />
            </div>
            <div>
              <Label>Tillverkare</Label>
              <Input value={form.tillverkare} onChange={e => set('tillverkare', e.target.value)} />
            </div>
            <div>
              <Label>Mått</Label>
              <Input value={form.matt} onChange={e => set('matt', e.target.value)} placeholder="T.ex. 400x400x50mm" />
            </div>
          </div>

          {/* Antal & Ekonomi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Antal *</Label>
              <Input type="number" value={form.antal} onChange={e => set('antal', e.target.value)} />
            </div>
            <div>
              <Label>Enhet</Label>
              <Select value={form.enhet} onValueChange={v => set('enhet', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['st', 'm²', 'm', 'kg', 'liter', 'pall', 'kartong'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_lager">I lager</SelectItem>
                  <SelectItem value="reserverad">Reserverad</SelectItem>
                  <SelectItem value="såld">Såld</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Inköpspris (kr/enhet) *</Label>
              <Input type="number" step="0.01" value={form.inkopspris} onChange={e => set('inkopspris', e.target.value)} />
            </div>
            <div>
              <Label>Försäljningspris (kr/enhet)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.forsaljningspris_manuell}
                onChange={e => set('forsaljningspris_manuell', e.target.value)}
                placeholder={`Auto: ${calcForsaljningspris().toLocaleString('sv-SE')} kr`}
              />
            </div>
            <div>
              <Label>Syfte</Label>
              <Select value={form.syfte} onValueChange={v => set('syfte', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internt">Internt bruk</SelectItem>
                  <SelectItem value="till_forsaljning">Till försäljning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inköp & Ursprung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Inköpsdatum</Label>
              <Input type="date" value={form.inkopsdatum} onChange={e => set('inkopsdatum', e.target.value)} />
            </div>
            <div>
              <Label>Inköpt ifrån</Label>
              <Input value={form.inkopt_fran} onChange={e => set('inkopt_fran', e.target.value)} placeholder="Leverantör" />
            </div>
            <div>
              <Label>Lev.fakturanummer</Label>
              <Input value={form.levfaktura_nummer} onChange={e => set('levfaktura_nummer', e.target.value)} />
            </div>
            <div>
              <Label>Ordernummer (från jobbet materialet kommer ifrån)</Label>
              <Input value={form.ordernummer} onChange={e => set('ordernummer', e.target.value)} placeholder="T.ex. 162057" />
            </div>
            <div>
              <Label>Kundnamn (kunden på jobbet materialet kommer ifrån)</Label>
              <Input value={form.kund_namn} onChange={e => set('kund_namn', e.target.value)} placeholder="T.ex. BRF Solgläntan" />
            </div>
            <div>
              <Label>Lagringsplats</Label>
              <Select value={form.location_id || '_none'} onValueChange={v => handleLocationChange(v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Välj plats" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Ingen vald</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Anteckningar */}
          <div>
            <Label>Anteckningar</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>

          {/* Historik – visas bara vid redigering */}
          {material?.id && (
            <div className="border-t pt-4">
              <MaterialHistorik materialId={material.id} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {material ? 'Spara ändringar' : 'Registrera material'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}