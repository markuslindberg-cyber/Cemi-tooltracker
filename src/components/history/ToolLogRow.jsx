import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowRight, User } from 'lucide-react';

const FIELD_LABELS = {
  name: 'Namn', status: 'Status', location_name: 'Plats', location_id: 'Plats-ID',
  satellite_location_name: 'Satellitplats', condition: 'Skick', assigned_to_name: 'Tilldelad',
  assigned_to_email: 'Tilldelad (e-post)', category: 'Kategori', subcategory: 'Underkategori',
  notes: 'Anteckningar', manufacturer: 'Tillverkare', model_number: 'Modell',
  serial_number: 'Serienummer', tool_number: 'Verktygsnummer', barcode: 'Streckkod',
  purchase_price: 'Inköpspris', purchase_date: 'Inköpsdatum', unit_name: 'Enhet',
};

export default function ToolLogRow({ log, tool }) {
  const created = log.change_type === 'created';
  return (
    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_1.4fr_170px] gap-2 md:gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
      <div className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{format(new Date(log.change_date), 'd MMM yyyy', { locale: sv })}</div>
        {format(new Date(log.change_date), 'HH:mm')}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{tool?.name || 'Okänd maskin'}</p>
        <p className="text-xs text-gray-500 truncate">S/N: {tool?.serial_number || '—'}{tool?.tool_number ? ` · Nr ${tool.tool_number}` : ''}</p>
        <p className="text-xs text-[#8B1E1E] font-medium">{created ? 'Skapad' : (FIELD_LABELS[log.field_name] || log.field_name || 'Ändring')}</p>
      </div>
      <div className="flex items-center gap-2 text-sm min-w-0 flex-wrap">
        {created ? <span className="text-gray-500">Maskinen registrerades</span> : (<>
          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 line-through break-all">{log.old_value || '—'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="px-2 py-0.5 rounded-md bg-[#8B1E1E]/10 text-[#8B1E1E] font-medium break-all">{log.new_value || '—'}</span>
        </>)}
        {log.comment && <p className="w-full text-xs text-gray-500 italic">{log.comment}</p>}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 min-w-0">
        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate">{log.changed_by_name || log.changed_by_email}</span>
      </div>
    </div>
  );
}

export { FIELD_LABELS };