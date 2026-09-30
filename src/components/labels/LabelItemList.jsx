import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const isNew = (d) => d && Date.now() - new Date(d).getTime() < 7 * 86400000;

export default function LabelItemList({ items, loading, selected, setSelected, search, setSearch, sort, setSort }) {
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allSel = items.length > 0 && items.every(i => selected.includes(i.id));
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[70vh]">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
        <Input placeholder="Sök benämning eller kod..." value={search} onChange={e => setSearch(e.target.value)} className="text-base" />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Senast tillagda först</SelectItem>
            <SelectItem value="oldest">Äldst först</SelectItem>
            <SelectItem value="name">Namn A–Ö</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{selected.length} valda av {items.length}</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(allSel ? [] : items.map(i => i.id))}>
            {allSel ? 'Avmarkera alla' : 'Markera alla'}
          </Button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          : items.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Inga objekt hittades</p>
          : items.map(i => (
            <label key={i.id} className="flex items-center gap-3 px-3 py-3 border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <Checkbox checked={selected.includes(i.id)} onCheckedChange={() => toggle(i.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{i.name}</p>
                  {isNew(i.created) && <span className="shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Ny</span>}
                </div>
                {i.created && <p className="text-xs text-gray-400">Tillagd {new Date(i.created).toLocaleDateString('sv-SE')}</p>}
                <p className="text-xs font-mono text-gray-500 truncate">{i.code}{i.sub ? ` · ${i.sub}` : ''}</p>
              </div>
            </label>
          ))}
      </div>
    </div>
  );
}