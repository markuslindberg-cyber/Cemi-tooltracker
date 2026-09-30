import { base44 } from '@/api/base44Client';

export const LABEL_TYPES = [
  { id: 'tools', label: 'Maskiner', load: () => base44.entities.Tool.list('-created_date', 2000),
    map: (t) => ({ id: t.id, name: t.name, code: t.barcode || t.tool_number || t.id, sub: [t.tool_number, t.category].filter(Boolean).join(' · ') }) },
  { id: 'handtools', label: 'Handredskap', load: () => base44.entities.HandTool.list('-created_date', 2000),
    map: (t) => ({ id: t.id, name: t.name, code: t.barcode || t.id, sub: [t.category, t.location_name].filter(Boolean).join(' · ') }) },
  { id: 'workwear', label: 'Arbetskläder', load: () => base44.entities.ArbetskläderUtrustning.list('-created_date', 2000),
    map: (t) => ({ id: t.id, name: t.name, code: t.barcode || t.id, sub: [t.subcategory, t.size].filter(Boolean).join(' · ') }) },
  { id: 'lokalvard', label: 'Lokalvård', load: () => base44.entities.LokalvardsArtikel.list('-created_date', 2000),
    map: (t) => ({ id: t.id, name: t.benamning, code: t.streckkod || t.artikelnummer || t.id, sub: '' }) },
  { id: 'material', label: 'Material', load: () => base44.entities.MaterialLager.list('-created_date', 2000),
    map: (t) => ({ id: t.id, name: t.benamning, code: t.streckkod || t.artikelnummer || t.id, sub: [t.kategori, t.matt].filter(Boolean).join(' · ') }) },
  { id: 'it', label: 'IT-utrustning', load: () => base44.entities.ITUtrustning.list('-created_date', 5000),
    map: (t) => ({ id: t.id, name: t.benamning, code: t.barcode || t.id, sub: [t.tillverkare, t.modell, t.serienummer].filter(Boolean).join(' · ') }) },
];

export const LABEL_SIZES = [
  { id: 'small', label: 'Liten (38×21 mm)', cls: 'w-[38mm] h-[21mm]', qr: 60, qrMm: 15, font: 2.2, barMm: 5 },
  { id: 'medium', label: 'Mellan (63×38 mm)', cls: 'w-[63mm] h-[38mm]', qr: 100, qrMm: 24, font: 3, barMm: 9 },
  { id: 'large', label: 'Stor (99×57 mm)', cls: 'w-[99mm] h-[57mm]', qr: 150, qrMm: 38, font: 4.2, barMm: 14 },
];

export const qrUrl = (text, size) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=0&data=${encodeURIComponent(text)}`;

export const barcodeUrl = (text) =>
  `https://bwipjs-api.metafloor.com/?bcid=code128&scale=2&height=10&includetext=false&text=${encodeURIComponent(text)}`;