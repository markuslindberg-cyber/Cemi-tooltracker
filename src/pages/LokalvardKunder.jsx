import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const kundTyper = ['Cemi', 'PHM', 'Övrig', 'BRF', 'Kommersiella', 'Koncernbolag', 'Internt'];

export default function LokalvardKunder() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [form, setForm] = useState({ namn: '', typ: 'Cemi', projektnummer: '' });
  const [submitting, setSubmitting] = useState(false);

  const { data: kunder = [], isLoading } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list().catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Kund.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kunder']);
      setForm({ namn: '', typ: 'Cemi', projektnummer: '' });
      setSubmitting(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Kund.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kunder']);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Kund.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kunder']);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.namn.trim()) return;
    setSubmitting(true);
    createMutation.mutate({
      namn: form.namn,
      typ: form.typ,
      projektnummer: form.projektnummer || null,
    });
  };

  const handleEditClick = (kund) => {
    setEditingId(kund.id);
    setEditForm({ namn: kund.namn, typ: kund.typ, projektnummer: kund.projektnummer || '' });
  };

  const handleSaveEdit = () => {
    if (!editForm.namn.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { namn: editForm.namn, typ: editForm.typ, projektnummer: editForm.projektnummer || null },
    });
  };

  const handleDelete = (id) => {
    if (confirm('Är du säker på att du vill ta bort denna kund?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">👥 Kunder – Lokalvård</h1>
        <span className="text-sm text-gray-500 font-medium">{kunder.length} kunder</span>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold mb-3">Lägg till ny kund</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Kundnamn"
            value={form.namn}
            onChange={(e) => setForm({...form, namn: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
          <select
            value={form.typ}
            onChange={(e) => setForm({...form, typ: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {kundTyper.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            placeholder="Projektnummer"
            value={form.projektnummer}
            onChange={(e) => setForm({...form, projektnummer: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 col-span-1 md:col-span-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-1" />}
            Lägg till
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Namn</th>
                <th className="px-4 py-2 text-left font-semibold">Typ</th>
                <th className="px-4 py-2 text-left font-semibold">Projektnummer</th>
                <th className="px-4 py-2 text-left font-semibold">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {kunder.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">Inga kunder ännu</td>
                </tr>
              ) : (
                kunder.map(kund => {
                  const isEditing = editingId === kund.id;
                  return (
                    <tr key={kund.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input type="text" value={editForm.namn} onChange={(e) => setEditForm({...editForm, namn: e.target.value})} className="px-2 py-1 border border-gray-300 rounded w-full" />
                        ) : kund.namn}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select value={editForm.typ} onChange={(e) => setEditForm({...editForm, typ: e.target.value})} className="px-2 py-1 border border-gray-300 rounded w-full">
                            {kundTyper.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : kund.typ}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input type="text" value={editForm.projektnummer} onChange={(e) => setEditForm({...editForm, projektnummer: e.target.value})} className="px-2 py-1 border border-gray-300 rounded w-full" />
                        ) : (kund.projektnummer || '-')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs font-semibold">✓</button>
                            <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-semibold">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => handleEditClick(kund)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(kund.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}