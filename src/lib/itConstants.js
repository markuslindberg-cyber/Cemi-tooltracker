import { Laptop, Monitor, Keyboard, Mouse, Smartphone, Tablet, Headphones, Cable, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export const IT_TYPES = [
  { id: 'dator', label: 'Dator', icon: Laptop },
  { id: 'skärm', label: 'Skärm', icon: Monitor },
  { id: 'tangentbord', label: 'Tangentbord', icon: Keyboard },
  { id: 'mus', label: 'Mus', icon: Mouse },
  { id: 'mobiltelefon', label: 'Mobiltelefon', icon: Smartphone },
  { id: 'surfplatta', label: 'Surfplatta', icon: Tablet },
  { id: 'headset', label: 'Headset', icon: Headphones },
  { id: 'dockningsstation', label: 'Dockningsstation', icon: Cable },
  { id: 'övrigt', label: 'Övrigt', icon: Package },
];

export const IT_STATUS = {
  i_bruk: { label: 'I bruk', cls: 'bg-blue-100 text-blue-700' },
  i_lager: { label: 'I lager', cls: 'bg-green-100 text-green-700' },
  repareras: { label: 'Repareras', cls: 'bg-amber-100 text-amber-700' },
  saknas: { label: 'Saknas', cls: 'bg-red-100 text-red-700' },
  kasserad: { label: 'Kasserad', cls: 'bg-gray-200 text-gray-600' },
};

export const typeInfo = (id) => IT_TYPES.find(t => t.id === id) || IT_TYPES[IT_TYPES.length - 1];

export async function nextITCode() {
  const all = await base44.entities.ITUtrustning.list('-created_date', 5000);
  const max = all.reduce((m, i) => Math.max(m, parseInt((i.barcode || '').replace('IT-', ''), 10) || 0), 0);
  return `IT-${String(max + 1).padStart(6, '0')}`;
}