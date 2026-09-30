import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Tag } from 'lucide-react';
import { LABEL_TYPES, LABEL_SIZES } from '@/lib/labelTypes';
import LabelCard from '@/components/labels/LabelCard';
import LabelItemList from '@/components/labels/LabelItemList';

export default function Etiketter() {
  const [user, setUser] = useState(null);
  const [typeId, setTypeId] = useState('tools');
  const [format, setFormat] = useState('both');
  const [sizeId, setSizeId] = useState('medium');
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser({})); }, []);
  const type = LABEL_TYPES.find(t => t.id === typeId);
  const size = LABEL_SIZES.find(s => s.id === sizeId);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['labels', typeId], enabled: user?.role === 'ägare', queryFn: type.load,
  });
  const [sort, setSort] = useState('newest');
  const items = useMemo(() => raw.filter(r => !r.is_deleted).map(r => ({ ...type.map(r), created: r.created_date })), [raw, type]);
  const filtered = items
    .filter(i => `${i.name} ${i.code}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'name' ? (a.name || '').localeCompare(b.name || '', 'sv')
      : sort === 'oldest' ? new Date(a.created) - new Date(b.created) : new Date(b.created) - new Date(a.created));
  const chosen = items.filter(i => selected.includes(i.id));

  if (!user) return null;
  if (user.role !== 'ägare') return <div className="p-8 text-center text-gray-500">Du har inte behörighet till denna sida.</div>;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#8B1E1E]/10 flex items-center justify-center"><Tag className="w-5 h-5 text-[#8B1E1E]" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Etiketter</h1>
            <p className="text-sm text-gray-500">Skriv ut QR-koder och streckkoder för inventarier</p>
          </div>
        </div>
        <Button disabled={!chosen.length} onClick={() => window.print()} className="bg-[#8B1E1E] hover:bg-[#8B1E1E]/90 text-white">
          <Printer /> Skriv ut / PDF ({chosen.length})
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <Select value={typeId} onValueChange={v => { setTypeId(v); setSelected([]); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{LABEL_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="both">QR-kod + streckkod</SelectItem>
            <SelectItem value="qr">Endast QR-kod</SelectItem>
            <SelectItem value="barcode">Endast streckkod</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sizeId} onValueChange={setSizeId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{LABEL_SIZES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className="print:hidden">
          <LabelItemList items={filtered} loading={isLoading} selected={selected} setSelected={setSelected} search={search} setSearch={setSearch} sort={sort} setSort={setSort} />
        </div>
        <div className="print-area bg-gray-100 dark:bg-gray-800 print:bg-white rounded-2xl p-4 min-h-[300px] overflow-x-auto">
          {chosen.length === 0
            ? <p className="text-center text-sm text-gray-500 py-16 print:hidden">Välj objekt i listan för att förhandsgranska etiketter</p>
            : <div className="flex flex-wrap gap-2">{chosen.map(i => <LabelCard key={i.id} item={i} format={format} size={size} />)}</div>}
        </div>
      </div>
    </div>
  );
}