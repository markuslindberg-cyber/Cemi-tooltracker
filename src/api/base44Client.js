import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// Route Tool create/update through the server so the change log records the real writer
const rawEntities = base44.entities;
base44.entities = new Proxy(rawEntities, {
  get(target, name) {
    const handler = target[name];
    if (name !== 'Tool' || !handler) return handler;
    return new Proxy(handler, {
      get(t, prop) {
        if (prop === 'create') return async (data) => (await base44.functions.invoke('saveTool', { data })).data;
        if (prop === 'update') return async (id, data) => (await base44.functions.invoke('saveTool', { id, data })).data;
        const v = t[prop];
        return typeof v === 'function' ? v.bind(t) : v;
      },
    });
  },
});