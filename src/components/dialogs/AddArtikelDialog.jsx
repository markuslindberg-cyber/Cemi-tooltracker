import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AddArtikelDialog({ open, onOpenChange, artiklar }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    streckkod: '',
    benamning: '',
    artikelnummer: '',
    pris: '',
    antal_inkopta: '',
    inkopsdatum: new Date().toISOString().split('T')[0],
    lagertroskelvarde: '10',
    utgaende: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LokalvardsArtikel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
      resetForm();
      onOpenChange(false);
    },
  });

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const resetForm = () => {
    setForm({
      streckkod: '',
      benamning: '',
      artikelnummer: '',
      pris: '',
      antal_inkopta: '',
      inkopsdatum: getTodayDate(),
      lagertroskelvarde: '10',
      utgaende: false,
    });
    setErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleStreckkodChange = (value) => {
    setForm({ ...form, streckkod: value });

    if (value.trim()) {
      const match = artiklar.find(a => a.streckkod === value);
      if (match) {
        setForm(prev => ({
          ...prev,
          streckkod: value,
          benamning: match.benamning,
          artikelnummer: match.artikelnummer || '',
          pris: match.pris.toString(),
          lagertroskelvarde: match.lagertroskelvarde?.toString() || '10',
          inkopsdatum: getTodayDate(),
        }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.streckkod.trim()) newErrors.streckkod = 'Streckkod är obligatorisk';
    if (!form.benamning.trim()) newErrors.benamning = 'Benämning är obligatorisk';
    if (!form.pris) newErrors.pris = 'Pris är obligatoriskt';
    if (!form.antal_inkopta) newErrors.antal_inkopta = 'Antal inköpt är obligatoriskt';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await createMutation.mutateAsync({
        streckkod: form.streckkod,
        benamning: form.benamning,
        artikelnummer: form.artikelnummer || null,
        pris: parseFloat(form.pris),
        antal_inkopta: parseInt(form.antal_inkopta),
        inkopsdatum: form.inkopsdatum,
        lagertroskelvarde: parseInt(form.lagertroskelvarde) || 10,
        utgaende: form.utgaende,
        current_quantity: parseInt(form.antal_inkopta),
      });
    } catch (err) {
      setErrors({ submit: err.message || 'Ett fel inträffade' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lägg till ny artikel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Streckkod */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Streckkod *
              </label>
              <Input
                type="text"
                value={form.streckkod}
                onChange={(e) => handleStreckkodChange(e.target.value)}
                placeholder="Skriv eller skanna streckkod"
                className={errors.streckkod ? 'border-red-500' : ''}
              />
              {errors.streckkod && <p className="text-xs text-red-500 mt-1">{errors.streckkod}</p>}
            </div>

            {/* Benämning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benämning *
              </label>
              <Input
                type="text"
                value={form.benamning}
                onChange={(e) => setForm({ ...form, benamning: e.target.value })}
                placeholder="T.ex. Rengöringsduk"
                className={errors.benamning ? 'border-red-500' : ''}
              />
              {errors.benamning && <p className="text-xs text-red-500 mt-1">{errors.benamning}</p>}
            </div>

            {/* Artikelnummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Artikelnummer
              </label>
              <Input
                type="text"
                value={form.artikelnummer}
                onChange={(e) => setForm({ ...form, artikelnummer: e.target.value })}
                placeholder="T.ex. ART-001"
              />
            </div>

            {/* Pris */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pris per enhet (kr) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={form.pris}
                onChange={(e) => setForm({ ...form, pris: e.target.value })}
                placeholder="0.00"
                className={errors.pris ? 'border-red-500' : ''}
              />
              {errors.pris && <p className="text-xs text-red-500 mt-1">{errors.pris}</p>}
            </div>

            {/* Antal inköpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Antal inköpt *
              </label>
              <Input
                type="number"
                value={form.antal_inkopta}
                onChange={(e) => setForm({ ...form, antal_inkopta: e.target.value })}
                placeholder="0"
                className={errors.antal_inkopta ? 'border-red-500' : ''}
              />
              {errors.antal_inkopta && <p className="text-xs text-red-500 mt-1">{errors.antal_inkopta}</p>}
            </div>

            {/* Inköpsdatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inköpsdatum
              </label>
              <Input
                type="date"
                value={form.inkopsdatum}
                onChange={(e) => setForm({ ...form, inkopsdatum: e.target.value })}
              />
            </div>

            {/* Lagertröskelvärde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lagertröskelvärde
              </label>
              <Input
                type="number"
                value={form.lagertroskelvarde}
                onChange={(e) => setForm({ ...form, lagertroskelvarde: e.target.value })}
                placeholder="10"
              />
            </div>

            {/* Utgående */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.utgaende}
                  onCheckedChange={(checked) => setForm({ ...form, utgaende: !!checked })}
                />
                <span className="text-sm font-medium text-gray-700">Utgående artikel</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || createMutation.isPending}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {loading ? 'Sparar...' : 'Lägg till artikel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}