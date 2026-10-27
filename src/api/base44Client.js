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

// Stamp every Tool write with the logged-in user so the change log can show who made it
let mePromise = null;
const getMe = () => (mePromise ||= base44.auth.me().catch(() => { mePromise = null; return null; }));
const stamp = async (data) => {
  const me = await getMe();
  return me ? { ...data, last_modified_by_email: me.email, last_modified_by_name: me.full_name || me.email } : data;
};

const rawEntities = base44.entities;
base44.entities = new Proxy(rawEntities, {
  get(target, name) {
    const handler = target[name];
    if (name !== 'Tool' || !handler) return handler;
    return {
      ...handler,
      list: handler.list.bind(handler),
      filter: handler.filter.bind(handler),
      get: handler.get.bind(handler),
      create: async (data) => handler.create(await stamp(data)),
      update: async (id, data) => handler.update(id, await stamp(data)),
      bulkCreate: async (items) => handler.bulkCreate(await Promise.all(items.map(stamp))),
      bulkUpdate: async (items) => handler.bulkUpdate(await Promise.all(items.map(stamp))),
    };
  },
});