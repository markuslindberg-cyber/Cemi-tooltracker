// Fields tracked in the Tool change log
export const TRACKED_FIELDS = [
  'name', 'manufacturer', 'model_number', 'serial_number', 'tool_number',
  'category', 'subcategory', 'status', 'condition',
  'purchase_date', 'purchase_price', 'purchase_location',
  'invoice_number', 'location_name',
  'satellite_location_name',
  'assigned_to_name',
  'main_machine_name', 'barcode', 'image_url', 'notes',
  'depreciation_level', 'service_cost', 'sold_place', 'sold_date',
];

export const toStr = (v) => (v === null || v === undefined || v === '') ? '' : String(v);

export function pickSnapshot(tool) {
  const out = {};
  for (const f of TRACKED_FIELDS) out[f] = toStr(tool?.[f]);
  return out;
}

export const TOOL_WRITE_ROLES = ['verktygsförvaltare', 'admin', 'mekaniker', 'admin_lokalvård', 'ägare'];