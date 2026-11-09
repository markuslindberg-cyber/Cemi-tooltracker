import React from 'react';
import { Truck, Tag, Inbox, AlertTriangle, Pencil, Loader2, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listProblem, validateSession } from '@/lib/massMove';
import ItemRow from './ItemRow';
import AssignSelect from './AssignSelect';

function ListCard({ list, onEdit, onRemove }) {
  const sale = list.kind === 'sale';
  const problem = list.items.length > 0 && listProblem(list);
  return (
    <div className={cn('rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden', problem ? 'border-red-200' : 'border-gray-100 dark:border-gray-800')}>
      <div className={cn('flex items-center gap-3 px-4 py-3', sale ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-[#8B1E1E]/5')}>
        {sale ? <Tag className="w-4 h-4 text-emerald-700" /> : <Truck className="w-4 h-4 text-[#8B1E1E]" />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{list.name || 'Namnlös'} <span className="text-gray-400 font-normal">· {list.items.length} st</span></p>
          <p className={cn('text-xs truncate', problem ? 'text-red-500' : 'text-gray-500')}>
            {problem || (sale ? `Markeras sålda · ${list.sale_place} · ${list.sale_date}` : `Flyttas till ${[list.location_name, list.satellite_location_name].filter(Boolean).join(' › ')}`)}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onEdit(list)}><Pencil className="w-4 h-4" /></Button>
      </div>
      {list.items.length > 0 && <div className="p-2">{list.items.map(i => <ItemRow key={i.id} item={i} onRemove={onRemove} />)}</div>}
    </div>
  );
}

export default function ReviewView({ session, onEdit, onRemove, onAssign, onDrop, onConfirm, confirming }) {
  const errors = validateSession(session);
  const total = session.lists.reduce((n, l) => n + l.items.length, 0);

  return (
    <div className="space-y-4">
      {session.lists.map(l => <ListCard key={l.id} list={l} onEdit={onEdit} onRemove={onRemove} />)}

      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Inbox className="w-4 h-4 text-amber-600" />
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Ej placerade <span className="font-normal">· {session.unplaced.length} st · lämnas oförändrade</span></p>
        </div>
        {session.unplaced.length > 0 && (
          <div className="p-2 bg-white dark:bg-gray-900">
            {session.unplaced.map(i => (
              <ItemRow key={i.id} item={i} onRemove={onDrop}
                action={session.lists.length > 0 ? <AssignSelect lists={session.lists} onAssign={id => onAssign(id, i)} /> : null} />
            ))}
          </div>
        )}
      </div>

      {session.unknown.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Ej igenkända streckkoder</p>
          <p className="text-xs text-gray-500 mt-1 break-all">{session.unknown.join(', ')}</p>
        </div>
      )}

      {errors.length > 0 && total > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
          {errors.map(e => <p key={e} className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{e}</p>)}
        </div>
      )}

      <Button onClick={onConfirm} disabled={errors.length > 0 || confirming} className="w-full h-12 text-base bg-[#8B1E1E] hover:bg-[#6B1515]">
        {confirming ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
        Bekräfta omgången ({total} föremål)
      </Button>
    </div>
  );
}