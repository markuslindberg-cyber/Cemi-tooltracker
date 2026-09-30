import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Laptop, Plus, UserMinus, UserPlus, Loader2 } from 'lucide-react';
import { IT_TYPES, IT_STATUS } from '@/lib/itConstants';
import ITStats from '@/components/it/ITStats';
import ITList from '@/components/it/ITList';
import ITFormModal from '@/components/it/ITFormModal';
import OffboardModal from '@/components/it/OffboardModal';
import OnboardModal from '@/components/it/OnboardModal';

export default function ITUtrustning() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [typ, setTyp] = useState('all');
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser({})); }, []);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['itutrustning'], enabled: user?.role === 'ägare',
    queryFn: () => base44.entities.ITUtrustning.list('-created_date', 5000),
  });
  const items = data.filter(i => !i.is_deleted);
  const q = search.toLowerCase();
  const filtered = items.filter(i => (typ === 'all' || i.typ === typ) && (status === 'all' || i.status === status)
    && [i.benamning, i.barcode, i.serienummer, i.assigned_to_person_name, i.modell].some(v => v?.toLowerCase().includes(q)));

  if (!user) return null;
  if (user.role !== 'ägare') return <div className="p-8 text-center text-gray-500">Du har inte behörighet till denna sida.</div>;
  const close = () => { setModal(null); setEditing(null); };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#8B1E1E]/10 flex items-center justify-center"><Laptop className="w-5 h-5 text-[#8B1E1E]" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">IT-utrustning</h1><p className="text-sm text-gray-500">All IT-utrustning i företaget</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModal('off')}><UserMinus /> Avsluta person</Button>
          <Button variant="outline" onClick={() => setModal('on')}><UserPlus /> Ny anställd</Button>
          <Button onClick={() => setModal('form')} className="bg-[#8B1E1E] hover:bg-[#8B1E1E]/90 text-white"><Plus /> Registrera</Button>
        </div>
      </div>
      <ITStats items={items} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input placeholder="Sök benämning, kod, serienr, person..." value={search} onChange={e => setSearch(e.target.value)} className="text-base" />
        <Select value={typ} onValueChange={setTyp}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alla typer</SelectItem>{IT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alla statusar</SelectItem>{Object.entries(IT_STATUS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : <ITList items={filtered} onOpen={i => { setEditing(i); setModal('form'); }} />}
      <ITFormModal open={modal === 'form'} item={editing} onClose={close} onSaved={refetch} />
      <OffboardModal open={modal === 'off'} items={items} onClose={close} onSaved={refetch} />
      <OnboardModal open={modal === 'on'} items={items} onClose={close} onSaved={refetch} />
    </div>
  );
}