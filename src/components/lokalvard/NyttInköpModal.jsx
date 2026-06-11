import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, X, ArrowLeft, ClipboardList } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function NyttInköpModal({ open, onClose, artiklar = [] }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('order'); // 'order' or 'items'
  const [ordernummer, setOrdernummer] = useState('');
  const [form, setForm] = useState({
    streckkod: '',
    benamning: '',
    artikelnummer: '',
    pris: '',
    antal: '',
    datum: new Date().toISOString().split('T')[0],
    lagertroskelvarde: '10',
    utgaende: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [addedItems, setAddedItems] = useState([]);
  const [matchedArtikel, setMatchedArtikel] = useState(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const resetForm = () => {
    setForm({
      streckkod: '',
      benamning: '',
      artikelnummer: '',
      pris: '',
      antal: '',
      datum: getTodayDate(),
      lagertroskelvarde: '10',
      utgaende: false,
    });
    setErrors({});
    setMatchedArtikel(null);
  };

  useEffect(() => {
    if (open) {
      setStep('order');
      setOrdernummer('');
      resetForm();
      setAddedItems([]);
    }
  }, [open]);

  const handleStreckkodChange = (value) => {
    setForm(prev => ({ ...prev, streckkod: value }));
    if (value.trim()) {
      const match = artiklar.find(a => a.streckkod === value && !a.is_deleted);
      if (match) {
        setMatchedArtikel(match);
        setForm(prev => ({
          ...prev,
          streckkod: value,
          benamning: match.benamning,
          artikelnummer: match.artikelnummer || '',
          pris: match.pris?.toString() || '',
          lagertroskelvarde: match.lagertroskelvarde?.toString() || '10',
          datum: getTodayDate(),
        }));
      } else {
        setMatchedArtikel(null);
      }
    } else {
      setMatchedArtikel(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.streckkod.trim()) newErrors.streckkod = 'Streckkod är obligatorisk';
    if (!form.benamning.trim()) newErrors.benamning = 'Benämning är obligatorisk';
    if (!form.pris) newErrors.pris = 'Pris är obligatoriskt';
    if (!form.antal) newErrors.antal = 'Antal är obligatoriskt';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const antal = parseFloat(form.antal);
      const pris = parseFloat(form.pris);

      if (matchedArtikel) {
        await base44.entities.LokalvardInköp.create({
          artikel_id: matchedArtikel.id,
          datum: form.datum,
          antal,
          pris,
          ordernummer: ordernummer.trim() || null,
        });
        await base44.entities.LokalvardsArtikel.update(matchedArtikel.id, {
          antal_inkopta: (matchedArtikel.antal_inkopta || 0) + antal,
          pris: pris,
          inkopsdatum: form.datum,
        });
      } else {
        const newArtikel = await base44.entities.LokalvardsArtikel.create({
          streckkod: form.streckkod,
          benamning: form.benamning,
          artikelnummer: form.artikelnummer || null,
          pris,
          antal_inkopta: parseInt(form.antal),
          inkopsdatum: form.datum,
          lagertroskelvarde: parseInt(form.lagertroskelvarde) || 10,
          utgaende: form.utgaende,
          current_quantity: parseInt(form.antal),
        });
        await base44.entities.LokalvardInköp.create({
          artikel_id: newArtikel.id,
          datum: form.datum,
          antal,
          pris,
          ordernummer: ordernummer.trim() || null,
        });
      }

      queryClient.invalidateQueries(['lokalvardsArtiklar']);
      queryClient.invalidateQueries(['lokalvardInkop']);
      setAddedItems(prev => [{
        id: Date.now(),
        benamning: form.benamning,
        streckkod: form.streckkod,
        antal: form.antal,
        pris: form.pris,
        isNew: !matchedArtikel,
      }, ...prev]);
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

  const isExisting = !!matchedArtikel;

  const totalCost = addedItems.reduce((sum, item) => sum + (parseFloat(item.antal) * parseFloat(item.pris)), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'order' ? 'Nytt inköp – Ordernummer' : 'Registrera inköp'}
          </DialogTitle>
        </DialogHeader>

        {step === 'order' ? (
          /* Step 1: Order number */
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Börja med att ange beställningsordernummer</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Alla artiklar du registrerar kopplas till detta ordernummer. 
                    Det gör det enkelt att spåra och jämföra mot orderbekräftelsen.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beställningsordernummer *</label>
              <Input
                type="text"
                autoFocus
                value={ordernummer}
                onChange={e => setOrdernummer(e.target.value)}
                placeholder="T.ex. BO-2024-0542"
                className="text-lg h-12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inköpsdatum</label>
              <Input
                type="date"
                value={form.datum}
                onChange={e => setForm({ ...form, datum: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onClose(false)}>Avbryt</Button>
              <Button
                onClick={() => setStep('items')}
                disabled={!ordernummer.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fortsätt →
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Step 2: Add items */
          <>
            {/* Order header */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <button onClick={() => setStep('order')} className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <ClipboardList className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Order: <span className="font-bold text-gray-900">{ordernummer}</span></span>
              <span className="text-xs text-gray-500 ml-auto">{form.datum}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-4">
                {errors.submit && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.submit}</AlertDescription>
                  </Alert>
                )}

                {isExisting && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                    ✅ Befintlig artikel hittad
                  </div>
                )}
                {form.streckkod.trim() && !isExisting && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
                    🆕 Ny streckkod – en ny artikel skapas
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Streckkod *</label>
                    <Input
                      type="text"
                      autoFocus
                      value={form.streckkod}
                      onChange={e => handleStreckkodChange(e.target.value)}
                      placeholder="Skriv eller skanna streckkod"
                      className={errors.streckkod ? 'border-red-500' : ''}
                    />
                    {errors.streckkod && <p className="text-xs text-red-500 mt-1">{errors.streckkod}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Benämning *</label>
                    <Input
                      type="text"
                      value={form.benamning}
                      onChange={e => setForm({ ...form, benamning: e.target.value })}
                      placeholder="T.ex. Rengöringsduk"
                      className={errors.benamning ? 'border-red-500' : ''}
                      disabled={isExisting}
                    />
                    {errors.benamning && <p className="text-xs text-red-500 mt-1">{errors.benamning}</p>}
                  </div>

                  {!isExisting && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Artikelnummer</label>
                      <Input
                        type="text"
                        value={form.artikelnummer}
                        onChange={e => setForm({ ...form, artikelnummer: e.target.value })}
                        placeholder="T.ex. ART-001"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pris per enhet (kr) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.pris}
                      onChange={e => setForm({ ...form, pris: e.target.value })}
                      placeholder="0.00"
                      className={errors.pris ? 'border-red-500' : ''}
                    />
                    {errors.pris && <p className="text-xs text-red-500 mt-1">{errors.pris}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Antal inköpt *</label>
                    <Input
                      type="number"
                      value={form.antal}
                      onChange={e => setForm({ ...form, antal: e.target.value })}
                      placeholder="0"
                      className={errors.antal ? 'border-red-500' : ''}
                    />
                    {errors.antal && <p className="text-xs text-red-500 mt-1">{errors.antal}</p>}
                  </div>

                  {!isExisting && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lagertröskelvärde</label>
                        <Input
                          type="number"
                          value={form.lagertroskelvarde}
                          onChange={e => setForm({ ...form, lagertroskelvarde: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={form.utgaende}
                            onCheckedChange={checked => setForm({ ...form, utgaende: !!checked })}
                          />
                          <span className="text-sm font-medium text-gray-700">Utgående artikel</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recently added for this order */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Artiklar i denna order ({addedItems.length})
                  {addedItems.length > 0 && (
                    <span className="font-normal text-gray-500 ml-2">
                      Totalt: {totalCost.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                    </span>
                  )}
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {addedItems.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">Inga inköp registrerade än</p>
                  ) : (
                    addedItems.map(item => (
                      <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-900 truncate">{item.benamning}</p>
                            {item.isNew && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Ny</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <p>Streckkod: {item.streckkod}</p>
                            <p>{item.antal} st × {parseFloat(item.pris).toLocaleString('sv-SE')} kr = {(parseFloat(item.antal) * parseFloat(item.pris)).toLocaleString('sv-SE')} kr</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAdded(item.id)}
                          className="text-gray-400 hover:text-red-600 flex-shrink-0"
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
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Sparar...' : 'Registrera & nästa'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}