import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Check, X, AlertCircle, Barcode, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Steg 1: Lista pending-begäranden och välj en
// Steg 2: Granska detaljer + godkänn/avslå
// Steg 3: (om godkänd) Skanna uttag

export default function LokalvardBegaranAttGodkanna() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1=lista, 2=granska, 3=skanna
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [user, setUser] = useState(null);

  // Steg 3: skanning
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
  });

  const personalMap = useMemo(() => {
    const map = {};
    personal.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [personal]);

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['workwearRequests'],
    queryFn: () => base44.entities.WorkwearRequest.list('-request_date', 10000),
  });

  const pendingRequests = allRequests.filter(r => r.status === 'pending');

  const { data: allItems = [] } = useQuery({
    queryKey: ['lokalvardLager'],
    queryFn: () => base44.entities.Inventarier.list('-updated_date', 500).catch(() => []),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId) =>
      base44.entities.WorkwearRequest.update(requestId, {
        status: 'approved',
        approved_by_email: user?.email,
        approved_by_name: personalMap[user?.id] || user?.full_name,
        approved_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workwearRequests']);
      setStep(3);
      setScannedItems([]);
      setBarcodeInput('');
      setError('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) =>
      base44.entities.WorkwearRequest.update(requestId, {
        status: 'rejected',
        notes: rejectNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workwearRequests']);
      setSelectedRequest(null);
      setRejectNotes('');
      setStep(1);
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      const checkout = await base44.entities.LokalvardCheckout.create(data);
      await base44.entities.WorkwearRequest.update(selectedRequest.id, { status: 'completed' });
      return checkout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workwearRequests']);
      setSuccess('Uttag registrerat!');
      setTimeout(() => {
        setSuccess('');
        setSelectedRequest(null);
        setScannedItems([]);
        setStep(1);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Fel vid registrering av uttag');
    },
  });

  const handleBarcodeInput = (barcode) => {
    const item = allItems.find(i => i.barcode === barcode);
    if (!item) {
      setError(`Streckkod ${barcode} hittades inte i lagret`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    const requestedItem = selectedRequest?.requested_items.find(ri => ri.id === item.id);
    if (!requestedItem) {
      setError(`${item.name} är inte på begäran`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    const existingScanned = scannedItems.find(si => si.item_id === item.id);
    if (existingScanned) {
      if (existingScanned.scanned_quantity >= requestedItem.quantity) {
        setError(`${item.name} är redan skannad i rätt mängd`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setScannedItems(prev =>
        prev.map(si => si.item_id === item.id
          ? { ...si, scanned_quantity: si.scanned_quantity + 1 }
          : si
        )
      );
    } else {
      setScannedItems(prev => [...prev, {
        item_id: item.id,
        name: item.name,
        barcode: item.barcode,
        quantity: requestedItem.quantity,
        scanned_quantity: 1,
        replacement_items: [],
      }]);
    }
    setBarcodeInput('');
    setError('');
  };

  const handleCheckoutSubmit = () => {
    if (!selectedRequest || scannedItems.length === 0) {
      setError('Skanna minst en artikel');
      return;
    }
    createCheckoutMutation.mutate({
      request_id: selectedRequest.id,
      customer_id: selectedRequest.customer_id,
      customer_name: selectedRequest.customer_name,
      checked_out_items: scannedItems,
      checked_out_date: new Date().toISOString(),
      checked_out_by_email: user?.email || '',
      checked_out_by_name: personalMap[user?.id] || user?.full_name || '',
    });
  };

  // Stegindikator
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[{ n: 1, label: 'Välj begäran' }, { n: 2, label: 'Granska' }, { n: 3, label: 'Skanna uttag' }].map(({ n, label }, i) => (
        <React.Fragment key={n}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            step === n ? 'bg-[#8B1E1E] text-white' : step > n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {step > n ? <Check className="w-3.5 h-3.5" /> : <span>{n}</span>}
            {label}
          </div>
          {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Begäran – Lokalvård</h1>
        <p className="text-gray-600 mt-1">Granska, godkänn och registrera uttag</p>
      </div>

      <StepIndicator />

      {/* STEG 1: Lista */}
      {step === 1 && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">Inga väntande begäranden</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => { setSelectedRequest(request); setRejectNotes(''); setStep(2); }}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-[#8B1E1E] hover:bg-[#8B1E1E]/5 bg-white transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{request.customer_name}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {request.requested_items?.length} artikel(r) • Begärd av: {request.requested_by_name || request.requested_by_email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(request.request_date), 'dd MMM HH:mm', { locale: sv })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* STEG 2: Granska */}
      {step === 2 && selectedRequest && (
        <Card className="p-6 space-y-6">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Tillbaka</button>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Begäran detaljer</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Kund</p>
                <p className="font-semibold">{selectedRequest.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Begärd av</p>
                <p className="font-semibold">{selectedRequest.requested_by_name}</p>
                <p className="text-sm text-gray-500">{selectedRequest.requested_by_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Datum</p>
                <p className="font-semibold">{format(new Date(selectedRequest.request_date), 'dd MMMM yyyy HH:mm', { locale: sv })}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Begärda artiklar</h3>
            <div className="space-y-2">
              {selectedRequest.requested_items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.subcategory}</p>
                  </div>
                  <p className="font-semibold">{item.quantity} st</p>
                </div>
              ))}
            </div>
          </div>

          {selectedRequest.notes && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-1">Anteckningar</p>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRequest.notes}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Anteckningar vid avslag (valfritt)</label>
              <Textarea
                placeholder="Förklara varför begäran avslås..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => approveMutation.mutate(selectedRequest.id)}
                disabled={approveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Godkänn & Gå till uttag
              </Button>
              <Button
                onClick={() => rejectMutation.mutate(selectedRequest.id)}
                disabled={rejectMutation.isPending}
                variant="outline"
                className="flex-1 text-red-600 hover:bg-red-50"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                Avslå
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEG 3: Skanna uttag */}
      {step === 3 && selectedRequest && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Skanna uttag</h2>
              <p className="text-sm text-gray-600">{selectedRequest.customer_name}</p>
            </div>
          </div>

          {/* Artikellista med skanningsstatus */}
          <div>
            <h3 className="font-semibold mb-3">Begärda artiklar</h3>
            <div className="space-y-2">
              {selectedRequest.requested_items?.map((item) => {
                const scanned = scannedItems.find(si => si.item_id === item.id);
                const isComplete = scanned && scanned.scanned_quantity >= item.quantity;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.subcategory}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{scanned?.scanned_quantity || 0}/{item.quantity}</p>
                      {isComplete && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streckkodsskanner */}
          <div className="border-t pt-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              Skanna streckkod
            </Label>
            <Input
              type="text"
              placeholder="Scanna streckkod här..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeInput(barcodeInput); }}
              autoFocus
              className="text-lg"
            />
          </div>

          {/* Skannade artiklar */}
          {scannedItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Skannade artiklar</h4>
              {scannedItems.map(item => (
                <div key={item.item_id} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-blue-900">{item.name}</p>
                    <p className="text-sm text-blue-700">Streckkod: {item.barcode} • Antal: {item.scanned_quantity}/{item.quantity}</p>
                  </div>
                  <button onClick={() => setScannedItems(prev => prev.filter(si => si.item_id !== item.item_id))} className="text-red-500 hover:text-red-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <Check className="w-4 h-4" />{success}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t">
            <Button
              onClick={handleCheckoutSubmit}
              disabled={createCheckoutMutation.isPending || scannedItems.length === 0}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {createCheckoutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Registrera uttag
            </Button>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setScannedItems([]); setStep(1); }}>
              Avbryt
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}