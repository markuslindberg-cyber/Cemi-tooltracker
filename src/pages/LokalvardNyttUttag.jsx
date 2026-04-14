import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Barcode, Plus, X, Check, AlertCircle, Upload, FileSpreadsheet } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LokalvardNyttUttag() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: approvedRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['approvedRequests'],
    queryFn: async () => {
      const requests = await base44.entities.WorkwearRequest.filter({ status: 'approved' });
      return requests;
    },
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['lokalvardLager'],
    queryFn: () => base44.entities.Inventarier.list('-updated_date', 500).catch(() => []),
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      const checkout = await base44.entities.LokalvardCheckout.create(data);
      // Uppdatera request status till completed
      if (selectedRequest?.id) {
        await base44.entities.WorkwearRequest.update(selectedRequest.id, { status: 'completed' });
      }
      return checkout;
    },
    onSuccess: () => {
      setSelectedRequest(null);
      setScannedItems([]);
      setBarcodeInput('');
      queryClient.invalidateQueries(['approvedRequests']);
      setSuccess('Uttag registrerat!');
      setTimeout(() => setSuccess(''), 3000);
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
        prev.map(si =>
          si.item_id === item.id
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

  const removeScannedItem = (itemId) => {
    setScannedItems(prev => prev.filter(si => si.item_id !== itemId));
  };

  const handleSubmit = async () => {
    if (!selectedRequest || scannedItems.length === 0) {
      setError('Välj en begäran och skanna minst en artikel');
      return;
    }

    const submitData = {
      request_id: selectedRequest.id,
      customer_id: selectedRequest.customer_id,
      customer_name: selectedRequest.customer_name,
      checked_out_items: scannedItems,
      checked_out_date: new Date().toISOString(),
      checked_out_by_email: user?.email || '',
      checked_out_by_name: user?.full_name || '',
    };

    createCheckoutMutation.mutate(submitData);
  };

  const handleDownloadTemplate = () => {
    const infoRows = [
      ['=== IMPORTMALL FÖR UTTAG ===', '', '', '', '', ''],
      ['Kolumn 1: kund_namn', 'Kolumn 2: personal_namn', 'Kolumn 3: artikel_benamning', 'Kolumn 4: artikel_antal', 'Kolumn 5: artikel_pris_per_enhet', 'Kolumn 6: ordernummer'],
      ['Kundens namn (obligatorisk)', 'Personalens namn (obligatorisk)', 'Artikelns namn (obligatorisk)', 'Antal (obligatorisk)', 'Pris per enhet (obligatorisk)', 'Ordernummer (valfritt)'],
      ['--- FYLL I DINA RADER NEDAN FRÅN RAD 6 ---', '', '', '', '', ''],
    ];
    const headers = ['kund_namn', 'personal_namn', 'artikel_benamning', 'artikel_antal', 'artikel_pris_per_enhet', 'ordernummer'];
    const exampleRow = ['Företag AB', 'Anna Andersson', 'Rengöringsduk', '5', '49.99', 'ORD-001'];
    const emptyRows = Array(19).fill(Array(6).fill(''));
    const csvContent = [
      ...infoRows.map(r => r.map(c => `"${c}"`).join(',')),
      headers.join(','),
      exampleRow.map(c => `"${c}"`).join(','),
      ...emptyRows.map(r => r.join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'lokalvard_uttag_mall.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            kund_namn: { type: 'string' },
            personal_namn: { type: 'string' },
            artikel_benamning: { type: 'string' },
            artikel_antal: { type: 'number' },
            artikel_pris_per_enhet: { type: 'number' },
            ordernummer: { type: 'string' },
          }
        }
      });
      if (result.status === 'success' && result.output) {
        const rows = Array.isArray(result.output) ? result.output : [result.output];
        const valid = rows.filter(r => r.kund_namn && r.personal_namn && r.artikel_benamning && r.artikel_antal && r.artikel_pris_per_enhet);
        if (valid.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const manad = today.substring(0, 7);
          await base44.entities.Uttag.bulkCreate(valid.map(r => ({
            datum: new Date().toISOString(),
            personal_id: '',
            personal_namn: r.personal_namn,
            kund_id: '',
            kund_namn: r.kund_namn,
            ordernummer: r.ordernummer || null,
            artiklar: [{
              artikel_id: '',
              benamning: r.artikel_benamning,
              antal: r.artikel_antal,
              pris_per_enhet: r.artikel_pris_per_enhet,
              total_pris: r.artikel_antal * r.artikel_pris_per_enhet,
            }],
            total_kostnad: r.artikel_antal * r.artikel_pris_per_enhet,
            manad: manad,
          })));
          queryClient.invalidateQueries(['uttag']);
          alert(`${valid.length} uttag importerades!`);
        } else {
          alert('Inga giltiga rader hittades i filen.');
        }
      } else {
        alert('Kunde inte läsa filen: ' + (result.details || 'Okänt fel'));
      }
    } catch (err) {
      alert('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skanna uttag – Lokalvård</h1>
          <p className="text-gray-600 mt-2">Välja godkänd begäran och skanna artiklar via streckkod</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Ladda ned mall
          </Button>
          <label>
            <Button variant="outline" disabled={importing} asChild>
              <span className="gap-2 cursor-pointer">
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importerar...</> : <><Upload className="w-4 h-4" />Importera CSV</>}
              </span>
            </Button>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>
      </div>

      {/* Request Selection */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>Välj begäran att utföra *</Label>
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Laddar begäranden...
            </div>
          ) : (
            <Select value={selectedRequest?.id || ''} onValueChange={(id) => {
              const request = approvedRequests.find(r => r.id === id);
              setSelectedRequest(request);
              setScannedItems([]);
              setBarcodeInput('');
              setError('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sök och välj godkänd begäran..." />
              </SelectTrigger>
              <SelectContent>
                {approvedRequests.map(request => (
                  <SelectItem key={request.id} value={request.id}>
                    {request.customer_name} - {request.requested_items.length} artikel(r)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {selectedRequest && (
        <Card className="p-6 space-y-6">
          {/* Begärad items info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Begärda artiklar</h3>
            <div className="space-y-2">
              {selectedRequest.requested_items.map((item) => {
                const scanned = scannedItems.find(si => si.item_id === item.id);
                const isComplete = scanned && scanned.scanned_quantity >= item.quantity;
                
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.subcategory}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {scanned?.scanned_quantity || 0}/{item.quantity}
                      </p>
                      {isComplete && (
                        <Check className="w-5 h-5 text-green-600 ml-auto" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barcode Scanner */}
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Barcode className="w-4 h-4" />
                Skanna streckkod
              </Label>
              <Input
                type="text"
                placeholder="Scanna streckkod här..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeInput(barcodeInput);
                  }
                }}
                autoFocus
                className="text-lg"
              />
            </div>

            {/* Scanned Items */}
            {scannedItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Skannde artiklar</h4>
                <div className="space-y-2">
                  {scannedItems.map(item => (
                    <div key={item.item_id} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div>
                        <p className="font-medium text-blue-900">{item.name}</p>
                        <p className="text-sm text-blue-700">Streckkod: {item.barcode} • Antal: {item.scanned_quantity}/{item.quantity}</p>
                      </div>
                      <button
                        onClick={() => removeScannedItem(item.item_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={createCheckoutMutation.isPending || scannedItems.length === 0}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {createCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Registrera uttag
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedRequest(null);
                setScannedItems([]);
                setBarcodeInput('');
                setError('');
              }}
              variant="outline"
            >
              Avbryt
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}