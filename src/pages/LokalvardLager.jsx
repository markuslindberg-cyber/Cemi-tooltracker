import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function LokalvardLager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingArtikel, setEditingArtikel] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    benamning: '',
    artikelnummer: '',
    streckkod: '',
    pris: '',
    inkopsdatum: '',
    antal_inkopta: '',
    lagertroskelvarde: '',
    current_quantity: '',
    utgaende: false,
  });

  const { data: artiklar = [], isLoading } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 200).catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LokalvardsArtikel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LokalvardsArtikel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
      resetForm();
      setEditingArtikel(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LokalvardsArtikel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
    },
  });

  const resetForm = () => {
    setFormData({
      benamning: '',
      artikelnummer: '',
      streckkod: '',
      pris: '',
      inkopsdatum: '',
      antal_inkopta: '',
      lagertroskelvarde: '',
      current_quantity: '',
      utgaende: false,
    });
  };

  const handleSubmit = () => {
    const submitData = {
      benamning: formData.benamning,
      artikelnummer: formData.artikelnummer,
      streckkod: formData.streckkod || null,
      pris: parseFloat(formData.pris),
      inkopsdatum: formData.inkopsdatum,
      antal_inkopta: parseInt(formData.antal_inkopta),
      lagertroskelvarde: parseInt(formData.lagertroskelvarde),
      current_quantity: parseInt(formData.current_quantity || 0),
      utgaende: formData.utgaende,
    };

    if (editingArtikel) {
      updateMutation.mutate({ id: editingArtikel.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (artikel) => {
    setEditingArtikel(artikel);
    setFormData({
      benamning: artikel.benamning,
      artikelnummer: artikel.artikelnummer,
      streckkod: artikel.streckkod || '',
      pris: artikel.pris.toString(),
      inkopsdatum: artikel.inkopsdatum,
      antal_inkopta: artikel.antal_inkopta.toString(),
      lagertroskelvarde: artikel.lagertroskelvarde.toString(),
      current_quantity: artikel.current_quantity.toString(),
      utgaende: artikel.utgaende,
    });
    setShowForm(true);
  };

  const filteredArtiklar = artiklar.filter(a =>
    a.benamning.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.artikelnummer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLowStock = (artikel) => artikel.current_quantity <= artikel.lagertroskelvarde;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lager – Lokalvård</h1>
          <p className="text-gray-600 mt-2">Hantera lokalvårdsartiklar och lagernivåer</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingArtikel(null);
            setShowForm(true);
          }}
          className="bg-[#8B1E1E] hover:bg-[#6B1515]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ny artikel
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Sök efter artikelnamn eller artikelnummer..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {/* Form */}
      {showForm && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {editingArtikel ? 'Redigera artikel' : 'Ny artikel'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Benämning *</label>
              <Input
                value={formData.benamning}
                onChange={(e) => setFormData({ ...formData, benamning: e.target.value })}
                placeholder="T.ex. Rengöringsduk"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Artikelnummer *</label>
              <Input
                value={formData.artikelnummer}
                onChange={(e) => setFormData({ ...formData, artikelnummer: e.target.value })}
                placeholder="T.ex. ART-001"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Streckkod</label>
              <Input
                value={formData.streckkod}
                onChange={(e) => setFormData({ ...formData, streckkod: e.target.value })}
                placeholder="Streckkod"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Pris per enhet *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.pris}
                onChange={(e) => setFormData({ ...formData, pris: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Inköpsdatum *</label>
              <Input
                type="date"
                value={formData.inkopsdatum}
                onChange={(e) => setFormData({ ...formData, inkopsdatum: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Antal inköpta *</label>
              <Input
                type="number"
                value={formData.antal_inkopta}
                onChange={(e) => setFormData({ ...formData, antal_inkopta: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Lagertröskelvärde *</label>
              <Input
                type="number"
                value={formData.lagertroskelvarde}
                onChange={(e) => setFormData({ ...formData, lagertroskelvarde: e.target.value })}
                placeholder="Lägsta lagernivå"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Aktuellt antal i lager</label>
              <Input
                type="number"
                value={formData.current_quantity}
                onChange={(e) => setFormData({ ...formData, current_quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.utgaende}
              onChange={(e) => setFormData({ ...formData, utgaende: e.target.checked })}
              id="utgaende"
              className="w-4 h-4"
            />
            <label htmlFor="utgaende" className="text-sm text-gray-600">Utgående artikel</label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                editingArtikel ? 'Uppdatera' : 'Skapa'
              )}
            </Button>
            <Button
              onClick={() => {
                setShowForm(false);
                setEditingArtikel(null);
                resetForm();
              }}
              variant="outline"
            >
              Avbryt
            </Button>
          </div>
        </Card>
      )}

      {/* Artiklar List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredArtiklar.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Inga artiklar registrerade</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredArtiklar.map((artikel) => (
            <Card key={artikel.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{artikel.benamning}</h3>
                    {isLowStock(artikel) && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Lågt lager
                      </div>
                    )}
                    {artikel.utgaende && (
                      <div className="px-2 py-1 bg-gray-100 rounded text-gray-700 text-xs font-medium">
                        Utgående
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Artikelnummer: {artikel.artikelnummer}</p>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-600">Aktuellt lager</p>
                      <p className="font-semibold text-gray-900">{artikel.current_quantity} st</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tröskelvärde</p>
                      <p className="font-semibold text-gray-900">{artikel.lagertroskelvarde} st</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pris</p>
                      <p className="font-semibold text-gray-900">{artikel.pris.toFixed(2)} kr/st</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Inköpt</p>
                      <p className="font-semibold text-gray-900">{format(new Date(artikel.inkopsdatum), 'dd MMM yyyy', { locale: sv })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleEdit(artikel)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(artikel.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}