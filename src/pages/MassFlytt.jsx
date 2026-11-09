import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRightLeft, ScanLine, ListChecks, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { UNPLACED, newListId, findItem, locateItem, placeItem, dropItem } from '@/lib/massMove';
import { useMassMoveSession } from '@/hooks/useMassMoveSession';
import ListChips from '@/components/massflytt/ListChips';
import ListFormDialog from '@/components/massflytt/ListFormDialog';
import ScanPanel from '@/components/massflytt/ScanPanel';
import ActiveListPanel from '@/components/massflytt/ActiveListPanel';
import DuplicateDialog from '@/components/massflytt/DuplicateDialog';
import ReviewView from '@/components/massflytt/ReviewView';

const activeFilter = (r) => !r.is_deleted && !['sålda', 'såld', 'retired', 'kasserad'].includes(r.status);

export default function MassFlytt() {
  const { toast } = useToast();
  const { data: tools = [] } = useQuery({ queryKey: ['massflytt-tools'], queryFn: () => base44.entities.Tool.list('-created_date', 5000) });
  const { data: handTools = [] } = useQuery({ queryKey: ['massflytt-handtools'], queryFn: () => base44.entities.HandTool.list('-created_date', 5000) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: () => base44.entities.Location.list() });
  const { session, setSession, loading, confirm, confirming } = useMassMoveSession();

  const [view, setView] = useState('scan');
  const [active, setActive] = useState(UNPLACED);
  const [editing, setEditing] = useState(null); // null | 'new' | list
  const [feedback, setFeedback] = useState(null);
  const [duplicate, setDuplicate] = useState(null);

  const labelOf = (id) => id === UNPLACED ? 'Ej placerade' : session.lists.find(l => l.id === id)?.name || 'lista';
  const activeList = session.lists.find(l => l.id === active);
  const target = activeList ? active : UNPLACED;

  const handleScan = (code) => {
    const item = findItem(code, tools.filter(activeFilter), handTools.filter(activeFilter));
    if (!item) {
      const c = code.trim();
      setSession(s => s.unknown.includes(c) ? s : { ...s, unknown: [c, ...s.unknown] });
      return setFeedback({ kind: 'unknown', text: `Ej igenkänd: ${c}` });
    }
    const where = locateItem(session, item.id);
    if (where === target) return setFeedback({ kind: 'same', text: `${item.name} finns redan här` });
    if (where) return setDuplicate({ item, whereLabel: labelOf(where) });
    setSession(s => placeItem(s, target, item));
    setFeedback({ kind: 'added', text: `${item.name} → ${labelOf(target)}` });
  };

  const saveList = (form) => {
    if (editing === 'new') {
      const id = newListId();
      setSession(s => ({ ...s, lists: [...s.lists, { ...form, id, items: [] }] }));
      setActive(id);
    } else {
      setSession(s => ({ ...s, lists: s.lists.map(l => l.id === editing.id ? { ...l, ...form, items: l.items } : l) }));
    }
    setEditing(null);
  };

  const deleteList = (id) => {
    setSession(s => {
      const list = s.lists.find(l => l.id === id);
      return { ...s, lists: s.lists.filter(l => l.id !== id), unplaced: [...(list?.items || []), ...s.unplaced] };
    });
    setActive(UNPLACED);
    setEditing(null);
  };

  const removeToUnplaced = (itemId) => {
    const item = session.lists.flatMap(l => l.items).find(i => i.id === itemId);
    if (item) setSession(s => placeItem(s, UNPLACED, item));
  };
  const assign = (listId, item) => setSession(s => placeItem(s, listId, item));
  const drop = (itemId) => setSession(s => dropItem(s, itemId));

  const handleConfirm = async () => {
    let res;
    try {
      res = await confirm();
    } catch (e) {
      return toast({ title: 'Kunde inte bekräfta', description: e.message, variant: 'destructive' });
    }
    toast({ title: 'Omgången bekräftad', description: `${res.moved} flyttade, ${res.sold} markerade som sålda.` });
    setActive(UNPLACED);
    setView('scan');
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const tab = (key, Icon, label) => (
    <button onClick={() => setView(key)} className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
      view === key ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500')}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8B1E1E] flex items-center justify-center shadow-lg shadow-[#8B1E1E]/20 shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Massflytt</h1>
            <p className="text-sm text-gray-500 mt-0.5">Skanna maskiner och handredskap till flytt- eller säljlistor. Inget ändras förrän du bekräftar.</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          {tab('scan', ScanLine, 'Skanna')}
          {tab('review', ListChecks, 'Granska & bekräfta')}
        </div>

        {view === 'scan' ? (
          <>
            <ListChips lists={session.lists} unplacedCount={session.unplaced.length} active={target} onSelect={setActive} onAdd={() => setEditing('new')} />
            <ScanPanel targetLabel={labelOf(target)} onScan={handleScan} feedback={feedback} />
            <ActiveListPanel list={activeList} unplaced={session.unplaced} lists={session.lists}
              onEdit={setEditing} onRemove={removeToUnplaced} onAssign={assign} onDrop={drop} />
          </>
        ) : (
          <ReviewView session={session} onEdit={setEditing} onRemove={removeToUnplaced} onAssign={assign} onDrop={drop}
            onConfirm={handleConfirm} confirming={confirming} />
        )}
      </div>

      <ListFormDialog open={!!editing} onOpenChange={o => !o && setEditing(null)} list={editing === 'new' ? null : editing}
        locations={locations} onSave={saveList} onDelete={deleteList} />
      <DuplicateDialog duplicate={duplicate} targetLabel={labelOf(target)} onClose={() => setDuplicate(null)}
        onMove={() => { setSession(s => placeItem(s, target, duplicate.item)); setFeedback({ kind: 'added', text: `${duplicate.item.name} → ${labelOf(target)}` }); setDuplicate(null); }} />
    </div>
  );
}