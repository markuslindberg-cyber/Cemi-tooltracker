export const FIELD_LABELS = {
  name: 'Namn', status: 'Status', location_name: 'Plats', satellite_location_name: 'Satellitplats',
  condition: 'Skick', assigned_to_name: 'Tilldelad', category: 'Kategori', subcategory: 'Underkategori',
  notes: 'Anteckningar', manufacturer: 'Tillverkare', model_number: 'Modell',
  serial_number: 'Serienummer', tool_number: 'Verktygsnummer', barcode: 'Streckkod',
  purchase_price: 'Inköpspris', purchase_date: 'Inköpsdatum', purchase_location: 'Inköpsställe',
  invoice_number: 'Fakturanummer', main_machine_name: 'Huvudmaskin', unit_name: 'Enhet',
  depreciation_level: 'Avskrivningsnivå', service_cost: 'Servicekostnad', image_url: 'Bild',
};

export const HIDDEN_LOG_FIELDS = ['location_id', 'satellite_location_id', 'assigned_to_email', 'main_machine_id', 'image_url'];

const VALUE_LABELS = {
  status: { available: 'Tillgänglig', in_use: 'Används', i_lager: 'I lager', maintenance: 'Service', missing: 'Saknas', retired: 'Kasserad', 'sålda': 'Såld' },
  condition: { new: 'Ny', good: 'Bra', fair: 'Okej', poor: 'Dålig' },
};

export const fieldLabel = (field) => FIELD_LABELS[field] || field || 'Ändring';
export const valueLabel = (field, value) => VALUE_LABELS[field]?.[value] || value;