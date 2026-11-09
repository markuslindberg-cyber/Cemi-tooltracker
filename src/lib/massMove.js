// Helpers for the multi-list mass move (massflytt) flow.
// Session shape: { lists: [{ id, name, kind: 'move'|'sale', location_id, location_name,
//   satellite_location_id, satellite_location_name, sale_place, sale_date, items: [] }],
//   unplaced: [], unknown: [] }

export const UNPLACED = 'unplaced';

export const emptySession = () => ({ lists: [], unplaced: [], unknown: [] });

export const newListId = () => `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const toItem = (rec, type) => ({
  id: rec.id,
  type,
  name: rec.name,
  code: rec.barcode || rec.tool_number || '',
  from_location: [rec.location_name, rec.satellite_location_name].filter(Boolean).join(' › '),
});

export function findItem(code, tools, handTools) {
  const c = (code || '').trim();
  if (!c) return null;
  const t = tools.find(x => x.barcode?.trim() === c)
    || tools.find(x => x.tool_number?.trim() === c || x.id === c);
  if (t) return toItem(t, 'tool');
  const h = handTools.find(x => x.barcode?.trim() === c || x.id === c);
  return h ? toItem(h, 'handtool') : null;
}

export function locateItem(session, itemId) {
  if (session.unplaced.some(i => i.id === itemId)) return UNPLACED;
  return session.lists.find(l => l.items.some(i => i.id === itemId))?.id || null;
}

const without = (session, itemId) => ({
  ...session,
  unplaced: session.unplaced.filter(i => i.id !== itemId),
  lists: session.lists.map(l => ({ ...l, items: l.items.filter(i => i.id !== itemId) })),
});

// Places an item in target (list id or UNPLACED), removing it from anywhere else
export function placeItem(session, target, item) {
  const s = without(session, item.id);
  if (target === UNPLACED) return { ...s, unplaced: [item, ...s.unplaced] };
  return { ...s, lists: s.lists.map(l => l.id === target ? { ...l, items: [item, ...l.items] } : l) };
}

export const dropItem = (session, itemId) => without(session, itemId);

export function listProblem(list) {
  if (!list.name?.trim()) return 'Namn saknas';
  if (list.kind === 'move' && !list.location_id) return 'Destination saknas';
  if (list.kind === 'sale' && !list.sale_place?.trim()) return 'Försäljningsställe saknas';
  if (list.kind === 'sale' && !list.sale_date) return 'Försäljningsdatum saknas';
  return null;
}

export function validateSession(session) {
  const errors = [];
  const seen = new Set();
  session.lists.forEach(l => {
    if (l.items.length === 0) return;
    const p = listProblem(l);
    if (p) errors.push(`${l.name || 'Namnlös lista'}: ${p}`);
    l.items.forEach(i => {
      if (seen.has(i.id)) errors.push(`${i.name} finns i flera listor`);
      seen.add(i.id);
    });
  });
  if (seen.size === 0) errors.push('Inga föremål i någon lista');
  return errors;
}

export function buildUpdates(session) {
  const updates = [];
  session.lists.forEach(l => {
    l.items.forEach(i => {
      const entity = i.type === 'tool' ? 'Tool' : 'HandTool';
      const data = l.kind === 'move'
        ? {
            location_id: l.location_id,
            location_name: l.location_name,
            satellite_location_id: l.satellite_location_id || null,
            satellite_location_name: l.satellite_location_name || null,
          }
        : { status: i.type === 'tool' ? 'sålda' : 'såld', sold_place: l.sale_place.trim(), sold_date: l.sale_date };
      updates.push({ entity, id: i.id, data });
    });
  });
  return updates;
}

export const listCountsLabel = (session) =>
  session.lists.reduce((n, l) => n + l.items.length, 0);