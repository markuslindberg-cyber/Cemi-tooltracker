import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Check, X, AlertCircle, Barcode, ChevronRight, ChevronDown, Clock, Ban, Plus } from 'lucide-react';
import ManualScanDialog from '@/components/ManualScanDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Steg 1: Lista pending-begäranden och välj en
// Steg 2: Granska detaljer + godkänn/avslå
// Steg 3: (om godkänd) Skanna uttag

export default function LokalvardBegaranAttGodkanna() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending'); // 'pending' | 'history'
  const [step, setStep] = useState(1); // 1=lista, 2=granska, 3=skanna
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [user, setUser] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [editingCheckout, setEditingCheckout] = useState(null);
  const [editedItems, setEditedItems] = useState([]);

  // Steg 3: skanning
    const [scannedItems, setScannedItems] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showReplacementUI, setShowReplacementUI] = useState(false);
    const [currentItemForReplacement, setCurrentItemForReplacement] = useState(null);
    const [currentScannedItemId, setCurrentScannedItemId] = useState(null);
    const [showManualInputDialog, setShowManualInputDialog] = useState(false);
    const barcodeInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Ladda sparade scannedItems från localStorage när en begäran väljs
  useEffect(() => {
    if (selectedRequest && step === 3) {
      const saved = localStorage.getItem(`scanned_${selectedRequest.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setScannedItems(parsed);
        } catch (e) {}
      }
    }
  }, [selectedRequest, step]);

  // Spara scannedItems till localStorage när de ändras
  useEffect(() => {
    if (selectedRequest && step === 3 && scannedItems.length > 0) {
      localStorage.setItem(`scanned_${selectedRequest.id}`, JSON.stringify(scannedItems));
    }
  }, [scannedItems, selectedRequest, step]);

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
  const historyRequests = allRequests.filter(r => ['approved', 'rejected', 'completed'].includes(r.status));

  const { data: allItems = [] } = useQuery({
    queryKey: ['lokalvardArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
  });

  const { data: checkouts = [] } = useQuery({
    queryKey: ['lokalvardCheckouts'],
    queryFn: () => base44.entities.LokalvardCheckout.list(null, 10000).catch(() => []),
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
      queryClient.invalidateQueries(['lokalvardCheckouts']);
      queryClient.invalidateQueries(['uttag']);
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

  const updateCheckoutMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.LokalvardCheckout.update(data.id, {
        checked_out_items: data.checked_out_items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardCheckouts']);
      queryClient.invalidateQueries(['uttag']);
      setSuccess('Uttag uppdaterat!');
      setTimeout(() => {
        setSuccess('');
        setEditingCheckout(null);
        setEditedItems([]);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Fel vid uppdatering av uttag');
    },
  });

  const handleBarcodeInput = (barcode) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    console.log('🔍 Söker efter:', trimmed);
    console.log('📦 Totalt artiklar i lagret:', allItems.length);
    console.log('📋 Begärda artiklar:', selectedRequest?.requested_items.length);

    // Sök i lagret - försök exakt match på streckkod/old_streckkod/artikelnummer, sedan namn
    let item = allItems.find(i => 
      i.streckkod === trimmed || 
      i.old_streckkod === trimmed || 
      i.artikelnummer === trimmed
    );

    if (item) {
      console.log('✅ Hittad artikel:', item);
    }

    if (!item) {
      item = allItems.find(i => (i.benamning || i.name || '').toLowerCase().includes(trimmed.toLowerCase()));
    }
    if (!item) {
      console.log('❌ Artikel inte hittad');
      setError(`Streckkod/artikelnummer ${trimmed} hittades inte i lagret`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    // Validera att artikeln är på begäran - matcha på ID, namn eller både
    const requestedItem = selectedRequest?.requested_items.find(ri => 
      ri.id === item.id || 
      ri.id === item.benamning ||
      ri.name === item.benamning ||
      ri.name === item.name
    );
    if (!requestedItem) {
      setError(`${item.benamning || item.name} är inte på begäran`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Lägg direkt till i scannedItems
    const newScannedItem = {
      item_id: item.id,
      name: item.benamning || item.name,
      barcode: item.streckkod,
      quantity: requestedItem.quantity,
      scanned_quantity: 1,
      replacement_items: [],
    };
    
    const existingScanned = scannedItems.find(si => si.item_id === item.id);
    if (existingScanned) {
      if (existingScanned.scanned_quantity + 1 > requestedItem.quantity) {
        setError(`Kan inte ta ut mer än ${requestedItem.quantity} st`);
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
      setScannedItems(prev => [...prev, newScannedItem]);
    }
    
    // Rensa och fokusera igen
    setBarcodeInput('');
    setError('');
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };



  const handleManualAddItem = (item, quantity) => {
    if (!selectedRequest) return;

    const requestedItem = selectedRequest.requested_items.find(ri => 
      ri.id === item.id || 
      ri.id === item.benamning ||
      ri.name === item.benamning ||
      ri.name === item.name
    );
    if (!requestedItem) {
      setError(`${item.benamning || item.name} är inte på begäran`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const existingScanned = scannedItems.find(si => si.item_id === item.id);
    if (existingScanned) {
      if (existingScanned.scanned_quantity + quantity > requestedItem.quantity) {
        setError(`Kan inte ta ut mer än ${requestedItem.quantity} st`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setScannedItems(prev =>
        prev.map(si => si.item_id === item.id
          ? { ...si, scanned_quantity: si.scanned_quantity + quantity }
          : si
        )
      );
    } else {
      setScannedItems(prev => [...prev, {
        item_id: item.id,
        name: item.benamning || item.name,
        barcode: item.streckkod,
        quantity: requestedItem.quantity,
        scanned_quantity: quantity,
        replacement_items: [],
      }]);
    }
    setSuccess(`Lade till ${quantity} st av ${item.benamning || item.name} manuellt.`);
    setTimeout(() => setSuccess(''), 3000);
    setShowManualInputDialog(false);
  };

  const handleConfirmItemWithReplacements = (replacements) => {
    setScannedItems(prev => [...prev, { ...currentItemForReplacement, replacement_items: replacements }]);
    setShowReplacementUI(false);
    setCurrentItemForReplacement(null);
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

  const statusBadge = (status) => {
    const map = {
      pending:   { label: 'Väntande',   cls: 'bg-yellow-100 text-yellow-800' },
      approved:  { label: 'Godkänd',    cls: 'bg-blue-100 text-blue-800' },
      rejected:  { label: 'Nekad',      cls: 'bg-red-100 text-red-700' },
      completed: { label: 'Utförd',     cls: 'bg-green-100 text-green-700' },
    };
    const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Begäran – Lokalvård</h1>
        <p className="text-gray-600 mt-1">Granska, godkänn och registrera uttag</p>
      </div>

      {/* Flikar – visas bara när man är på steg 1 */}
      {step === 1 && (
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'pending' ? 'border-[#8B1E1E] text-[#8B1E1E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Väntande {pendingRequests.length > 0 && <span className="ml-1 bg-[#8B1E1E] text-white text-xs rounded-full px-1.5">{pendingRequests.length}</span>}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'history' ? 'border-[#8B1E1E] text-[#8B1E1E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Historik
          </button>
        </div>
      )}

      {/* REDIGERA TIDIGARE UTTAG */}
      {step === 1.5 && editingCheckout && (
        <Card className="p-6 space-y-6">
          <div>
            <button onClick={() => { setEditingCheckout(null); setEditedItems([]); setStep(1); }} className="text-sm text-gray-500 hover:text-gray-700">← Tillbaka</button>
            <h2 className="text-xl font-semibold mt-4">Redigera uttag</h2>
            <p className="text-sm text-gray-600">Korrigera antal för {editingCheckout.customer_name}</p>
          </div>

          <div className="space-y-3">
            {editedItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.barcode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={item.scanned_quantity}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10) || 0;
                      setEditedItems(prev =>
                        prev.map((it, i) => i === idx ? { ...it, scanned_quantity: newVal } : it)
                      );
                    }}
                    className="w-16 text-sm"
                  />
                  <span className="text-sm text-gray-600">/ {item.quantity} st</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 border-t pt-4">
            <Button
              onClick={() => updateCheckoutMutation.mutate({ id: editingCheckout.id, checked_out_items: editedItems })}
              disabled={updateCheckoutMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateCheckoutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Spara ändringar
            </Button>
            <Button variant="outline" onClick={() => { setEditingCheckout(null); setEditedItems([]); setStep(1); }}>
              Avbryt
            </Button>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
          {success && <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}
        </Card>
      )}

      {step !== 1 && step !== 1.5 && <StepIndicator />}

      {/* STEG 1: Lista */}
      {step === 1 && tab === 'pending' && (
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
              {pendingRequests.map((request) => {
                const hasSavedScan = localStorage.getItem(`scanned_${request.id}`);
                return (
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
                      {hasSavedScan && (
                        <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">✓ Sparad skanning</span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Historik */}
      {step === 1 && tab === 'history' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : historyRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Ingen historik ännu</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Senast registrerade uttag */}
              {historyRequests.filter(r => r.status === 'completed').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-3 px-1">Senast registrerade uttag</h3>
                  <div className="space-y-2">
                    {historyRequests
                      .filter(r => r.status === 'completed')
                      .sort((a, b) => new Date(b.updated_date || b.request_date) - new Date(a.updated_date || a.request_date))
                      .map((request) => (
                        <div key={request.id} className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
                          <button
                            onClick={() => setExpandedHistory(expandedHistory === request.id ? null : request.id)}
                            className="w-full text-left p-3 flex items-center justify-between hover:bg-green-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {statusBadge(request.status)}
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{request.customer_name}</p>
                                <p className="text-xs text-gray-600">
                                  {format(new Date(request.updated_date || request.request_date), 'dd MMM HH:mm', { locale: sv })}
                                </p>
                              </div>
                              {request.status === 'completed' && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">✓ Uttaget</span>
                              )}
                              {request.status === 'approved' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Väntande uttag</span>
                              )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedHistory === request.id ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedHistory === request.id && (
                            <div className="border-t border-green-200 p-3 bg-white space-y-3 text-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-gray-500 text-xs">Begärd av</p>
                                  <p className="font-medium">{request.requested_by_name || request.requested_by_email}</p>
                                </div>
                                {request.approved_by_name && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Godkänd av</p>
                                    <p className="font-medium">{request.approved_by_name}</p>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-gray-600 font-medium mb-1">Artiklar</p>
                                <div className="space-y-0.5">
                                  {request.requested_items?.map((item, idx) => {
                                    const checkout = checkouts.find(c => c.request_id === request.id);
                                    const checkedOutItem = checkout?.checked_out_items?.find(ci => ci.item_id === item.id || ci.name === item.name);
                                    return (
                                      <div key={idx} className="flex justify-between text-xs">
                                        <span className="text-gray-700">{item.name}</span>
                                        <span className="font-medium text-green-700">{checkedOutItem?.scanned_quantity || item.quantity} st</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const checkout = checkouts.find(c => c.request_id === request.id);
                                  if (checkout) {
                                    setEditingCheckout(checkout);
                                    setEditedItems(JSON.parse(JSON.stringify(checkout.checked_out_items)));
                                    setStep(1.5);
                                  }
                                }}
                                className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                              >
                                ✏️ Redigera antal
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Övrig historik */}
              <div>
                {historyRequests.filter(r => r.status !== 'completed').length > 0 && (
                  <h3 className="text-sm font-semibold text-gray-600 mb-3 px-1">Övrig historik</h3>
                )}
                <div className="space-y-2">
              {historyRequests.filter(r => r.status !== 'completed').map((request) => (
                <div key={request.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setExpandedHistory(expandedHistory === request.id ? null : request.id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {statusBadge(request.status)}
                      <div>
                        <p className="font-semibold text-gray-900">{request.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {request.requested_items?.length} artikel(r) • {format(new Date(request.request_date), 'dd MMM yyyy', { locale: sv })}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedHistory === request.id ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedHistory === request.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Begärd av</p>
                          <p className="font-medium">{request.requested_by_name || request.requested_by_email}</p>
                        </div>
                        {request.approved_by_name && (
                          <div>
                            <p className="text-gray-500">Godkänd av</p>
                            <p className="font-medium">{request.approved_by_name}</p>
                          </div>
                        )}
                        {request.approved_date && (
                          <div>
                            <p className="text-gray-500">Datum godkänd</p>
                            <p className="font-medium">{format(new Date(request.approved_date), 'dd MMM yyyy HH:mm', { locale: sv })}</p>
                          </div>
                        )}
                      </div>

                      <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">Artiklar</p>
                       <div className="space-y-1">
                         {request.requested_items?.map((item, idx) => {
                           const checkout = checkouts.find(c => c.request_id === request.id);
                           const checkedOutItem = checkout?.checked_out_items?.find(ci => ci.item_id === item.id || ci.name === item.name);
                           const isCheckedOut = !!checkedOutItem;
                           return (
                             <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white rounded border border-gray-100">
                               <span>{item.name} <span className="text-gray-400">{item.subcategory}</span></span>
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{item.quantity} st</span>
                                 {isCheckedOut ? (
                                   <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</div>
                                 ) : (
                                   <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs">−</div>
                                 )}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                       </div>

                       {request.notes && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Anteckningar</p>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-100">{request.notes}</p>
                        </div>
                       )}

                       {request.status === 'approved' && (
                         <Button
                           size="sm"
                           onClick={() => setStep(3) || setSelectedRequest(request)}
                           className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                         >
                           → Gå till uttag
                         </Button>
                       )}
                       </div>
                       )}
                       </div>
                       ))}
                       </div>
                       </div>
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
                 const scanned = scannedItems.find(si => 
                   si.item_id === item.id || 
                   si.name === item.name || 
                   si.name === item.id
                 );
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
             ref={barcodeInputRef}
             type="text"
             placeholder="Scanna streckkod här..."
             value={barcodeInput}
             onChange={(e) => setBarcodeInput(e.target.value)}
             onKeyDown={(e) => { if (e.key === 'Enter' && barcodeInput.trim()) handleBarcodeInput(barcodeInput); }}
             autoFocus
             className="text-lg"
             />
             <Button variant="outline" onClick={() => setShowManualInputDialog(true)} className="w-full mt-2">
              <Plus className="w-4 h-4 mr-2" /> Manuell inmatning
             </Button>
             </div>

             {/* Skannade artiklar */}
          {scannedItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Skannade artiklar</h4>
              {scannedItems.map(item => (
                <div key={item.item_id} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-blue-900">{item.name}</p>
                      <p className="text-sm text-blue-700">Streckkod: {item.barcode} • Antal: {item.scanned_quantity}/{item.quantity}</p>
                    </div>
                    <button onClick={() => setScannedItems(prev => prev.filter(si => si.item_id !== item.item_id))} className="text-red-500 hover:text-red-700">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {item.replacement_items && item.replacement_items.length > 0 && (
                    <div className="text-xs text-blue-700 bg-white p-2 rounded mt-2">
                      <p className="font-medium mb-1">Ersättningsvara:</p>
                      {item.replacement_items.map((ri, idx) => (
                        <p key={idx}>{ri.name} ({ri.quantity} st)</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ersättningsvara UI */}
          {showReplacementUI && currentItemForReplacement && (
            <div className="border-t pt-4 space-y-3 bg-amber-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-amber-900">Lägg till ersättningsvara för {currentItemForReplacement.name}?</h4>
                <button onClick={() => { setShowReplacementUI(false); setCurrentItemForReplacement(null); }} className="text-amber-600 hover:text-amber-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-amber-800">Välj ersättningsvara från listan eller hoppa över:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allItems
                  .filter(i => i.id !== currentItemForReplacement.item_id && selectedRequest?.requested_items.some(ri => ri.id === i.id))
                  .map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleConfirmItemWithReplacements([{ item_id: item.id, name: item.benamning || item.name, quantity: 1 }]);
                      }}
                      className="w-full text-left p-2 bg-white border border-amber-200 rounded hover:bg-amber-100 text-sm font-medium"
                    >
                      {item.benamning || item.name}
                    </button>
                  ))}
              </div>
              <Button
                onClick={() => handleConfirmItemWithReplacements([])}
                variant="outline"
                className="w-full text-sm"
              >
                Hoppa över - Lägg till utan ersättning
              </Button>
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
            <Button 
              variant="outline" 
              onClick={() => { 
                localStorage.setItem(`scanned_${selectedRequest.id}`, JSON.stringify(scannedItems));
                setSelectedRequest(null); 
                setScannedItems([]); 
                setStep(1);
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700"
            >
              Pausa (sparad)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { 
                localStorage.removeItem(`scanned_${selectedRequest.id}`);
                setSelectedRequest(null); 
                setScannedItems([]); 
                setStep(1); 
              }}
            >
              Avbryt & rensa
            </Button>
          </div>
        </Card>
      )}

      {selectedRequest && (
        <ManualScanDialog
          isOpen={showManualInputDialog}
          onClose={() => setShowManualInputDialog(false)}
          allItems={allItems}
          onManualAdd={handleManualAddItem}
        />
      )}
    </div>
  );
}