// Shared definition of required fields for a "complete" tool record
// Used by both Inventory.jsx filter and ToolFormModal.jsx banner

export const REQUIRED_FIELDS = ['name', 'category', 'manufacturer', 'model_number', 'location_name', 'barcode', 'unit_id'];

export const REQUIRED_FIELD_LABELS = {
  name: 'Verktygsnamn',
  category: 'Kategori',
  manufacturer: 'Tillverkare',
  model_number: 'Modellnummer',
  location_name: 'Plats',
  barcode: 'Streckkod',
  unit_id: 'Enhet',
};

export function isToolIncomplete(tool) {
  return REQUIRED_FIELDS.some(f => !tool[f] || tool[f] === '');
}

export function getMissingFieldLabels(tool) {
  return Object.entries(REQUIRED_FIELD_LABELS)
    .filter(([key]) => !tool[key] || tool[key] === '')
    .map(([, label]) => label);
}