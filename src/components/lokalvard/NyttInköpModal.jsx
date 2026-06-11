import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function NyttInköpModal({ open, onClose, artiklar = [] }) {
  const queryClient = useQueryClient();
  const activeArtiklar = useMemo(() => artiklar.filter(a => !a.is_deleted), [artiklar]);

  const [form, setForm] = useState({
    streckkod: '',
    benamning: '',
    artikel_id: '',
    antal: '',
    pris: '',
    datum: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [addedItems, setAddedItems] = useState([]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LokalvardInköp.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardInkop']);
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
    },
  });

  const resetForm = () => {
    setForm({
      streckkod: '',
      benamning: '',
      artikel_id: '',
      antal: '',
      pris: '',
      datum: new Date().toISOString().split('T')[0],
    });
    setErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
      setAddedItems([]);
    }
  }, [open]);

  const handleStreckkodChange = (value) => {
    setForm(prev => ({ ...prev, streckkod: value }));

    if (value.trim()) {
      const match = activeArtiklar.find(a => a.streckkod === value || a.old_streckkod === value);
      if (match) {
        setForm(prev => ({
          ...prev,
          streckkod: value,
          benamning: match.benamning,
          artikel_id: match.id,
          pris: match.pris?.toString() || '',
          datum: new Date().toISOString().split('T')[0],
        }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.streckkod.trim()) newErrors.streckkod = 'Streckkod är obligatorisk';
    if (!form.antal) newErrors.antal = 'Antal är obligatoriskt';
    if (!form.pris) newErrors.pris = 'Pris är obligatoriskt';
    if (!form.artikel_id) newErrors.streckkod = 'Streckkoden matchar ingen artikel';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await createMutation.mutateAsync({
        artikel_id: form.artikel_id,
        datum: form.datum,
        antal: parseFloat(form.antal),
        pris: parseFloat(form.pris),
      });
      setAddedItems(prev => [{ ...form, id: Date.now().toString() }, ...prev]);
      resetForm();
    } catch (err) {
      setErrors({ submit: err.message || 'Ett fel inträffade' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdded = (id) => {
    setAddedItems(prev => prev.filter(item => item.id !== id));
  };

  const totalKostnad = (parseFloat(form.antal) || 0) * (parseFloat(form.pris) || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nytt inköp</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulär */}
          <div className="space-y-4">
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Streckkod */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Streckkod *</label>
                <Input
                  type="text"
                  autoFocus
                  value={form.streckkod}
                  onChange={(e) => handleStreckkodChange(e.target.value)}
                  placeholder="Skriv eller skanna streckkod"
                  className={errors.streckkod ? 'border-red-500' : ''}
                />
                {errors.streckkod && <p className="text-xs text-red-500 mt-1">{errors.streckkod}</p>}
                {form.benamning && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {form.benamning}
                  </p>
                )}
              </div>

              {/* Antal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Antal *</label>
                <Input
                  type="number"
                  min="1"
                  value={form.antal}
                  onChange={(e) => setForm(prev => ({ ...prev, antal: e.target.value }))}
                  placeholder="0"
                  className={errors.antal ? 'border-red-500' : ''}
                />
                {errors.antal && <p className="text-xs text-red-500 mt-1">{errors.antal}</p>}
              </div>

              {/* Pris */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pris per enhet (kr) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.pris}
                  onChange={(e) => setForm(prev => ({ ...prev, pris: e.target.value }))}
                  placeholder="0.00"
                  className={errors.pris ? 'border-red-500' : ''}
                />
                {errors.pris && <p className="text-xs text-red-500 mt-1">{errors.pris}</p>}
              </div>

              {/* Datum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <Input
                  type="date"
                  value={form.datum}
                  onChange={(e) => setForm(prev => ({ ...prev, datum: e.target.value }))}
                />
              </div>
            </div>

            {totalKostnad > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
                <span className="text-blue-700">Totalkostnad: </span>
                <span className="font-bold text-blue-900">
                  {totalKostnad.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </span>
              </div>
            )}
          </div>

          {/* Nyligen tillagda */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Nyligen tillagda ({addedItems.length})</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {addedItems.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">Inga inköp tillagda än</p>
              ) : (
                addedItems.map((item) => (
                  <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900 truncate">{item.benamning}</p>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>Streckkod: {item.streckkod}</p>
                        <p>{item.antal} st × {parseFloat(item.pris).toLocaleString('sv-SE')} kr = {(parseFloat(item.antal) * parseFloat(item.pris)).toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</p>
                        <p>Datum: {item.datum}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAdded(item.id)}
                      className="text-gray-400 hover:text-red-600 flex-shrink-0"
                      title="Ta bort från listan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onClose(false)}>Stäng</Button>
          <Button
            onClick={handleSave}
            disabled={loading || createMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Sparar...' : 'Lägg till nästa inköp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}