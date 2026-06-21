import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { ScanLine, Package, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function MaterialUttagModal({ isOpen, onClose, materials = [], onSuccess }) {
  const [step, setStep] = useState('scan'); // 'scan' | 'form'
  const [scanInput, setScanInput] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [antal, setAntal] = useState('1');
  const [kundNamn, setKundNamn] = useState('');
  const [ordernummer, setOrdernummer] = useState('');
  const [notering, setNotering] = useState('');
  const [saving, setSaving] = useState(false);
  const scanRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setScanInput('');
      setSelectedMaterial(null);
      setAntal('1');
      setKundNamn('');
      setOrdernummer('');
      setNotering('');
      setTimeout(() => scanRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleScan = (value) => {
    const code = value.trim();
    if (!code) return;
    const found = materials.find(m =>
      m.artikelnummer === code || m.artikelnummer?.toLowerCase() === code.toLowerCase()
    );
    if (found) {
      setSelectedMaterial(found);
      setStep('form');
    } else {
      toast({ title: 'Material hittades inte', description: `Ingen artikel med streckkod "${code}"`, variant: 'destructive' });
      setScanInput('');
    }
  };

  const handleScanKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(scanInput);
    }
  };

  const selectManually = (m) => {
    setSelectedMaterial(m);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!kundNamn.trim() || !ordernummer.trim()) {
      toast({ title: 'Fyll i alla fält', description: 'Kundnamn och ordernummer krävs.', variant: 'destructive' });
      return;
    }
    const numAntal = parseFloat(antal);
    if (!numAntal || numAntal <= 0) {
      toast({ title: 'Ogiltigt antal', variant: 'destructive' });
      return;
    }
    if (numAntal > selectedMaterial.antal) {
      toast({ title: 'Otillräckligt saldo', description: `Finns ${selectedMaterial.antal} ${selectedMaterial.enhet || 'st'} i lager.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke('createMaterialUttag', {
        material_id: selectedMaterial.id,
        antal: numAntal,
        kund_namn: kundNamn.trim(),
        ordernummer: ordernummer.trim(),
        notering: notering.trim() || null,
      });
      toast({ title: 'Uttag registrerat', description: `${numAntal} ${selectedMaterial.enhet || 'st'} av ${selectedMaterial.benamning}` });
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      toast({ title: 'Fel vid uttag', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#8B1E1E]" />
            Materialuttag
          </DialogTitle>
        </DialogHeader>

        {step === 'scan' && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Skanna streckkod / Sök artikelnummer</Label>
              <Input
                ref={scanRef}
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Skanna eller skriv artikelnummer..."
                className="text-lg h-12 mt-1"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Tryck Enter efter skanning</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eller välj material:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {materials.filter(m => m.status === 'i_lager' && m.antal > 0).map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectManually(m)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{m.benamning}</p>
                      <p className="text-xs text-gray-400">{m.artikelnummer} · {m.kategori}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{m.antal} {m.enhet || 'st'}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${m.syfte === 'internt' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {m.syfte === 'internt' ? 'Internt' : 'Försäljning'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'form' && selectedMaterial && (
          <div className="space-y-4 py-2">
            {/* Selected material info */}
            <div className={`rounded-xl p-4 border ${selectedMaterial.syfte === 'internt' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedMaterial.benamning}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedMaterial.artikelnummer} · {selectedMaterial.kategori}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedMaterial.antal} {selectedMaterial.enhet || 'st'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedMaterial.syfte === 'internt' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
                    {selectedMaterial.syfte === 'internt' ? 'Internt bruk' : 'Till försäljning'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>Antal att ta ut *</Label>
              <Input type="number" min="1" max={selectedMaterial.antal} value={antal} onChange={e => setAntal(e.target.value)} className="mt-1" />
              {parseFloat(antal) > selectedMaterial.antal && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Överstiger lagersaldo
                </p>
              )}
            </div>

            <div>
              <Label>Kundnamn *</Label>
              <Input value={kundNamn} onChange={e => setKundNamn(e.target.value)} placeholder="T.ex. BRF Solgläntan" className="mt-1" />
            </div>

            <div>
              <Label>Ordernummer *</Label>
              <Input value={ordernummer} onChange={e => setOrdernummer(e.target.value)} placeholder="T.ex. 170234" className="mt-1" />
            </div>

            <div>
              <Label>Notering</Label>
              <Textarea value={notering} onChange={e => setNotering(e.target.value)} placeholder="Valfri notering..." rows={2} className="mt-1" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setStep('scan'); setSelectedMaterial(null); setScanInput(''); }}>
                Tillbaka
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Registrera uttag
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}