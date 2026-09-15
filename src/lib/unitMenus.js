export const MENU_GROUPS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'maskiner', label: 'Maskiner' },
  { id: 'handredskap', label: 'Handredskap' },
  { id: 'arbetsklader', label: 'Arbetskläder' },
  { id: 'lokalvard', label: 'Lokalvård' },
  { id: 'inventering', label: 'Inventeringskontroll' },
  { id: 'materialbanken', label: 'Materialbanken' },
  { id: 'administration', label: 'Administration' },
];

export const UNIT_NAV_CONFIG_KEY = 'unit_navigation_config';

export const ALL_MENU_IDS = MENU_GROUPS.map(g => g.id);