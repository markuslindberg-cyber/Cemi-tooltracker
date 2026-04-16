import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, X, Check, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function RequestWorkwear() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    requested_items: [],
    notes: '',
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [user, setUser] = useState(null);
  const [selectedHandler, setSelectedHandler] = useState(null);
  const [handlerOpen, setHandlerOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [artikelOpen, setArtikelOpen] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: rawItems = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).catch(() => []),
  });

  // En post per streckkod (senast inköpt)
  const items = Object.values(
    rawItems.reduce((acc, item) => {
      const key = item.streckkod || item.id;
      if (!acc[key] || new Date(item.inkopsdatum) > new Date(acc[key].inkopsdatum)) {
        acc[key] = item;
      }
      return acc;
    }, {})
  );

  const { data: handlers = [] } = useQuery({
    queryKey: ['handlers'],
    queryFn: async () => {
      const allMembers = await base44.entities.TeamMember.list(null, 10000);
      return allMembers.filter(m => m.role === 'lokalvårdare' || m.role === 'admin lokalvård');
    },
  });

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Kund.list('-updated_date', 10000).catch(() => []),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
  });

  const { data: previousRequests = [] } = useQuery({
    queryKey: ['previousWorkwearRequests'],
    queryFn: () => base44.entities.WorkwearRequest.list('-request_date', 200).catch(() => []),
  });

  const customers = allCustomers.filter(k => k.typ !== 'Internt');

  useEffect(() => {
    if (handlers.length > 0 && !selectedHandler) {
      const adminHandler = handlers.find(h => h.role === 'admin lokalvård' || h.role === 'admin_lokalvård');
      if (adminHandler) {
        setSelectedHandler(adminHandler);
      }
    }
  }, [handlers, selectedHandler]);

  const createRequestMutation = useMutation({
   mutationFn: (data) => base44.entities.WorkwearRequest.create(data),
   onSuccess: () => {
     setFormData({
       customer_id: '',
       customer_name: '',
       requested_items: [],
       notes: '',
     });
     setSelectedItem(null);
     setSelectedCustomer(null);
     queryClient.invalidateQueries(['workwearRequests']);
     alert('Begäran skickad!');
   },
  });

  const addItem = () => {
    if (!selectedItem) return;
    const existingItem = formData.requested_items.find(i => i.id === selectedItem.id);
    if (existingItem) {
      setFormData(prev => ({
        ...prev,
        requested_items: prev.requested_items.map(i =>
          i.id === selectedItem.id ? { ...i, quantity: i.quantity + selectedQty } : i
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        requested_items: [...prev.requested_items, {
          id: selectedItem.id,
          name: selectedItem.benamning || selectedItem.name,
          subcategory: selectedItem.subcategory,
          quantity: selectedQty,
        }]
      }));
    }
    setSelectedItem(null);
    setSelectedQty(1);
  };

  const handleCopyRequest = (request) => {
    setFormData(prev => ({
      ...prev,
      requested_items: request.requested_items || [],
    }));
    setShowCopyModal(false);
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      requested_items: prev.requested_items.filter(i => i.id !== id)
    }));
  };

  const handleSubmit = () => {
   if (!selectedCustomer || formData.requested_items.length === 0) {
     alert('Välj en kund och lägg till minst en artikel');
     return;
   }

   const teamMember = teamMembers.find(tm => tm.id === user?.id);

   const submitData = {
     customer_id: selectedCustomer.id,
     customer_name: selectedCustomer.namn,
     requested_items: formData.requested_items,
     notes: formData.notes,
     request_date: new Date().toISOString(),
     requested_by_email: user?.email || '',
     requested_by_name: selectedHandler?.name || user?.full_name || '',
     status: 'pending',
   };

   createRequestMutation.mutate(submitData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Begäran om uttag av lokalvårdsartiklar</h1>
        <p className="text-gray-600 mt-2">Fyll i formuläret för att göra en begäran</p>
      </div>

      {/* Kopiera modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Kopiera från tidigare begäran</h2>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {previousRequests.filter(r => r.requested_items?.length > 0).length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Inga tidigare begäranden hittades</p>
              ) : (
                previousRequests.filter(r => r.requested_items?.length > 0).map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleCopyRequest(r)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#8B1E1E] hover:bg-[#8B1E1E]/5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-gray-900">{r.customer_name}</p>
                      <span className="text-xs text-gray-400">{format(new Date(r.request_date), 'dd MMM yyyy', { locale: sv })}</span>
                    </div>
                    <p className="text-xs text-gray-500">{r.requested_items?.length} artikel(r): {r.requested_items?.map(i => `${i.name} (${i.quantity}st)`).join(', ')}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Card className="p-6 space-y-6">
         {/* Requester Info */}
         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
           <p className="text-sm text-gray-600">Begäran från</p>
           <p className="font-semibold text-gray-900">{user?.full_name}</p>
           <p className="text-sm text-gray-600">{user?.email}</p>
         </div>

         {/* Customer Selection */}
         <div className="space-y-2">
           <Label>Välj kund *</Label>
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {selectedCustomer ? selectedCustomer.namn : "Sök och välj kund..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Sök kund..." />
                <CommandEmpty>Ingen kund hittad.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                       key={customer.id}
                       value={customer.id}
                       onSelect={() => {
                         setSelectedCustomer(customer);
                         setFormData(prev => ({
                           ...prev,
                           customer_id: customer.id,
                           customer_name: customer.namn,
                         }));
                         setCustomerOpen(false);
                       }}
                     >
                       {customer.namn}
                     </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Handler Selection */}
        <div className="space-y-2">
          <Label>Välj uttagare</Label>
          <Popover open={handlerOpen} onOpenChange={setHandlerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {selectedHandler ? selectedHandler.name : "Sök och välj handläggare..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Sök handläggare..." />
                <CommandEmpty>Ingen handläggare hittad.</CommandEmpty>
                <CommandGroup>
                  {handlers.map((handler) => (
                   <CommandItem
                     key={handler.id}
                     value={`${handler.name} ${handler.email || ''}`}
                     onSelect={() => {
                       setSelectedHandler(handler);
                       setHandlerOpen(false);
                     }}
                     >
                     {handler.name}{handler.email ? ` (${handler.email})` : ''}
                   </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Item Selection */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Artiklar</h3>
            <Button variant="outline" size="sm" onClick={() => setShowCopyModal(true)} className="gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" /> Kopiera från tidigare
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label>Välj artikel</Label>
            <Popover open={artikelOpen} onOpenChange={setArtikelOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {selectedItem ? selectedItem.benamning : "Sök och välj artikel..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök artikel..." />
                  <CommandEmpty>Ingen artikel hittad.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {items.map(item => (
                      <CommandItem
                        key={item.id}
                        value={`${item.benamning} ${item.streckkod || ''} ${item.subcategory || ''}`}
                        onSelect={() => {
                          setSelectedItem(item);
                          setSelectedQty(1);
                          setArtikelOpen(false);
                        }}
                      >
                        {item.benamning}{item.subcategory ? ` – ${item.subcategory}` : ''}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedItem && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Antal</Label>
                <Input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <Button
                onClick={addItem}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till
              </Button>
            </div>
          )}

          {/* Selected Items List */}
          {formData.requested_items.length > 0 && (
            <div className="space-y-2">
              <Label>Valda artiklar</Label>
              <div className="space-y-2">
                {formData.requested_items.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.subcategory} • Antal: {item.quantity}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
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

        {/* Notes */}
        <div className="space-y-2">
          <Label>Anteckningar</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Lägg till eventuella kommentarer..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Skicka begäran
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}