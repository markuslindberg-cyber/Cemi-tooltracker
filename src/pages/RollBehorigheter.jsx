import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Save, RotateCcw, Database, Layout } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_OPERATIONS = [
  { id: 'can_view', label: 'Visa' },
];

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'mekaniker', label: 'Mekaniker' },
  { id: 'verktygsförvaltare', label: 'Verktygsförvaltare' },
  { id: 'admin_lokalvård', label: 'Admin Lokalvård' },
  { id: 'lokalvårdare', label: 'Lokalvårdare' },
];

const ENTITIES = [
  // Maskiner
  { id: 'Tool', label: 'Maskiner', group: 'Maskiner' },
  { id: 'Huvudmaskin', label: 'Huvudmaskiner', group: 'Maskiner' },
  { id: 'LoanRequest', label: 'Lån av utrustning', group: 'Maskiner' },
  { id: 'ServiceRecord', label: 'Servicehistorik', group: 'Maskiner' },
  { id: 'ServiceTemplate', label: 'Servicemallar', group: 'Maskiner' },
  { id: 'Transfer', label: 'Överföringar', group: 'Maskiner' },
  { id: 'ToolLog', label: 'Verktygslogg', group: 'Maskiner' },
  // Handredskap
  { id: 'HandTool', label: 'Handredskap', group: 'Handredskap' },
  // Arbetskläder
  { id: 'ArbetskläderUtrustning', label: 'Arbetskläder & Utrustning', group: 'Arbetskläder' },
  { id: 'WorkwearRequest', label: 'Begäran arbetskläder', group: 'Arbetskläder' },
  { id: 'LokalvardCheckout', label: 'Utcheckning arbetskläder', group: 'Arbetskläder' },
  { id: 'CheckoutReport', label: 'Uttagsrapporter', group: 'Arbetskläder' },
  // Lokalvård
  { id: 'LokalvardsArtikel', label: 'Lokalvårdsartiklar', group: 'Lokalvård' },
  { id: 'LokalvardArtikelRequest', label: 'Begäran lokalvård', group: 'Lokalvård' },
  { id: 'LokalvardInköp', label: 'Inköp lokalvård', group: 'Lokalvård' },
  { id: 'Uttag', label: 'Uttag', group: 'Lokalvård' },
  { id: 'Kund', label: 'Kunder', group: 'Lokalvård' },
  // Materialbanken
  { id: 'MaterialLager', label: 'Materiallager', group: 'Materialbanken' },
  { id: 'MaterialUttag', label: 'Materialuttag', group: 'Materialbanken' },
  // Inventering
  { id: 'InventorySession', label: 'Inventeringssessioner', group: 'Inventering' },
  { id: 'InventoryReport', label: 'Inventeringsrapporter', group: 'Inventering' },
  { id: 'Inventering', label: 'Inventeringar', group: 'Inventering' },
  { id: 'InventeringSkanning', label: 'Inventeringsskanningar', group: 'Inventering' },
  // Administration
  { id: 'Location', label: 'Platser', group: 'Administration' },
  { id: 'TeamMember', label: 'Personal', group: 'Administration' },
  { id: 'Category', label: 'Kategorier', group: 'Administration' },
  { id: 'CategoryImage', label: 'Kategoribilder', group: 'Administration' },
  { id: 'GlobalAppConfig', label: 'Appkonfiguration', group: 'Administration' },
  { id: 'DepreciationSetting', label: 'Avskrivningsinställningar', group: 'Administration' },
  { id: 'RolePermission', label: 'Roller & Behörigheter', group: 'Administration' },
];

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', group: 'Allmänt' },
  { id: 'maskiner', label: 'Maskiner – Översikt', group: 'Maskiner' },
  { id: 'huvudmaskiner', label: 'Huvudmaskiner', group: 'Maskiner' },
  { id: 'salda_redskap', label: 'Sålda & Kasserade', group: 'Maskiner' },
  { id: 'lan_utrustning', label: 'Lån av utrustning', group: 'Maskiner' },
  { id: 'service', label: 'Service', group: 'Maskiner' },
  { id: 'handredskap', label: 'Handredskap', group: 'Handredskap' },
  { id: 'arbetsklader', label: 'Arbetskläder & Skyddsutrustning', group: 'Arbetskläder' },
  { id: 'arbetsklader_rapporter', label: 'Uttagsrapporter', group: 'Arbetskläder' },
  { id: 'arbetsklader_begaran', label: 'Begäran – arbetskläder', group: 'Arbetskläder' },
  { id: 'arbetsklader_forfragan', label: 'Förfrågan – arbetskläder', group: 'Arbetskläder' },
  { id: 'arbetsklader_streckkod', label: 'Streckkodhantering', group: 'Arbetskläder' },
  { id: 'lokalvard_begaran', label: 'Begäran – lokalvårdsartiklar', group: 'Lokalvård' },
  { id: 'lokalvard_lager', label: 'Lager', group: 'Lokalvård' },
  { id: 'lokalvard_nyttuttag', label: 'Plocka ut begärda uttag', group: 'Lokalvård' },
  { id: 'lokalvard_uttag', label: 'Uttag', group: 'Lokalvård' },
  { id: 'lokalvard_godkanna', label: 'Godkänna begäran', group: 'Lokalvård' },
  { id: 'lokalvard_kostnad', label: 'Kostnad per kund', group: 'Lokalvård' },
  { id: 'lokalvard_kunder', label: 'Kunder', group: 'Lokalvård' },
  { id: 'lokalvard_produktstatistik', label: 'Produktstatistik', group: 'Lokalvård' },
  { id: 'lokalvard_inkopshistorik', label: 'Inköpshistorik', group: 'Lokalvård' },
  { id: 'lokalvard_omatchade', label: 'Omatchade inköp', group: 'Lokalvård' },
  { id: 'lokalvard_fakturering', label: 'Faktureringsunderlag', group: 'Lokalvård' },
  { id: 'inventering', label: 'Inventering', group: 'Inventering' },
  { id: 'inventering_rapporter', label: 'Inventeringsrapporter', group: 'Inventering' },
  { id: 'inventering_manual', label: 'Inventeringsmanual', group: 'Inventering' },
  { id: 'materialbanken', label: 'Materialbanken – Översikt', group: 'Materialbanken' },
  { id: 'materialbanken_uttag', label: 'Materialuttag', group: 'Materialbanken' },
  { id: 'platser', label: 'Platser', group: 'Administration' },
  { id: 'personal', label: 'Personal', group: 'Administration' },
  { id: 'kategorier', label: 'Kategorier', group: 'Administration' },
  { id: 'papperskorg', label: 'Papperskorg', group: 'Administration' },
  { id: 'roll_behorigheter', label: 'Roller & Behörigheter', group: 'Administration' },
  { id: 'avskrivningar', label: 'Avskrivningar', group: 'Administration' },
  { id: 'agaroversikt', label: 'Ägaröversikt', group: 'Administration' },
  { id: 'redigera_layout', label: 'Redigera layout', group: 'Administration' },
];

// Defines the actual default page access per role, matching Layout.jsx navigation logic.
// NOT_LOKALVARDARE = ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare']
// LOKALVARDARE_ROLES = ['lokalvårdare', 'admin_lokalvård', 'ägare']
const DEFAULT_PAGE_ACCESS = {
  admin: {
    dashboard: true,
    maskiner: true, huvudmaskiner: true, salda_redskap: true, lan_utrustning: true, service: true,
    handredskap: true,
    arbetsklader: true, arbetsklader_rapporter: true, arbetsklader_begaran: true, arbetsklader_forfragan: false, arbetsklader_streckkod: false,
    lokalvard_begaran: true, lokalvard_lager: false, lokalvard_nyttuttag: false, lokalvard_uttag: false, lokalvard_godkanna: false, lokalvard_kostnad: false, lokalvard_kunder: false, lokalvard_produktstatistik: false, lokalvard_inkopshistorik: false, lokalvard_omatchade: false, lokalvard_fakturering: false,
    inventering: true, inventering_rapporter: true, inventering_manual: true,
    materialbanken: true, materialbanken_uttag: true,
    platser: true, personal: true, kategorier: true, papperskorg: true, roll_behorigheter: false, avskrivningar: false, agaroversikt: false, redigera_layout: false,
  },
  mekaniker: {
    dashboard: true,
    maskiner: true, huvudmaskiner: true, salda_redskap: true, lan_utrustning: true, service: true,
    handredskap: true,
    arbetsklader: true, arbetsklader_rapporter: true, arbetsklader_begaran: true, arbetsklader_forfragan: false, arbetsklader_streckkod: false,
    lokalvard_begaran: true, lokalvard_lager: false, lokalvard_nyttuttag: false, lokalvard_uttag: false, lokalvard_godkanna: false, lokalvard_kostnad: false, lokalvard_kunder: false, lokalvard_produktstatistik: false, lokalvard_inkopshistorik: false, lokalvard_omatchade: false, lokalvard_fakturering: false,
    inventering: true, inventering_rapporter: true, inventering_manual: true,
    materialbanken: true, materialbanken_uttag: true,
    platser: true, personal: true, kategorier: true, papperskorg: true, roll_behorigheter: false, avskrivningar: false, agaroversikt: false, redigera_layout: false,
  },
  'verktygsförvaltare': {
    dashboard: true,
    maskiner: true, huvudmaskiner: true, salda_redskap: true, lan_utrustning: true, service: true,
    handredskap: true,
    arbetsklader: false, arbetsklader_rapporter: false, arbetsklader_begaran: true, arbetsklader_forfragan: false, arbetsklader_streckkod: false,
    lokalvard_begaran: false, lokalvard_lager: false, lokalvard_nyttuttag: false, lokalvard_uttag: false, lokalvard_godkanna: false, lokalvard_kostnad: false, lokalvard_kunder: false, lokalvard_produktstatistik: false, lokalvard_inkopshistorik: false, lokalvard_omatchade: false, lokalvard_fakturering: false,
    inventering: true, inventering_rapporter: true, inventering_manual: true,
    materialbanken: true, materialbanken_uttag: true,
    platser: true, personal: false, kategorier: false, papperskorg: false, roll_behorigheter: false, avskrivningar: false, agaroversikt: false, redigera_layout: false,
  },
  'admin_lokalvård': {
    dashboard: true,
    maskiner: true, huvudmaskiner: true, salda_redskap: true, lan_utrustning: true, service: true,
    handredskap: true,
    arbetsklader: true, arbetsklader_rapporter: true, arbetsklader_begaran: true, arbetsklader_forfragan: true, arbetsklader_streckkod: true,
    lokalvard_begaran: true, lokalvard_lager: true, lokalvard_nyttuttag: true, lokalvard_uttag: true, lokalvard_godkanna: true, lokalvard_kostnad: true, lokalvard_kunder: true, lokalvard_produktstatistik: true, lokalvard_inkopshistorik: true, lokalvard_omatchade: true, lokalvard_fakturering: true,
    inventering: true, inventering_rapporter: true, inventering_manual: true,
    materialbanken: true, materialbanken_uttag: true,
    platser: true, personal: true, kategorier: true, papperskorg: true, roll_behorigheter: false, avskrivningar: false, agaroversikt: false, redigera_layout: false,
  },
  'lokalvårdare': {
    dashboard: true,
    maskiner: false, huvudmaskiner: false, salda_redskap: false, lan_utrustning: false, service: false,
    handredskap: false,
    arbetsklader: false, arbetsklader_rapporter: false, arbetsklader_begaran: true, arbetsklader_forfragan: false, arbetsklader_streckkod: false,
    lokalvard_begaran: true, lokalvard_lager: false, lokalvard_nyttuttag: false, lokalvard_uttag: false, lokalvard_godkanna: false, lokalvard_kostnad: false, lokalvard_kunder: false, lokalvard_produktstatistik: false, lokalvard_inkopshistorik: false, lokalvard_omatchade: false, lokalvard_fakturering: false,
    inventering: false, inventering_rapporter: false, inventering_manual: false,
    materialbanken: false, materialbanken_uttag: false,
    platser: false, personal: false, kategorier: false, papperskorg: false, roll_behorigheter: false, avskrivningar: false, agaroversikt: false, redigera_layout: false,
  },
};

const OPERATIONS = [
  { id: 'can_create', label: 'Skapa' },
  { id: 'can_read', label: 'Läsa' },
  { id: 'can_update', label: 'Uppdatera' },
  { id: 'can_delete', label: 'Radera' },
];

function makeKey(role, entity) {
  return `${role}__${entity}`;
}

export default function RollBehorigheter() {
  const queryClient = useQueryClient();
  const [localPerms, setLocalPerms] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => base44.entities.RolePermission.list('-created_date', 500),
  });

  // Build a lookup from saved permissions
  const savedLookup = useMemo(() => {
    const map = {};
    permissions.forEach(p => {
      map[makeKey(p.role_name, p.entity_name)] = p;
    });
    return map;
  }, [permissions]);

  // Initialize local state from saved data
  useEffect(() => {
    const local = {};
    ROLES.forEach(role => {
      ENTITIES.forEach(entity => {
        const key = makeKey(role.id, entity.id);
        const saved = savedLookup[key];
        local[key] = {
          can_create: saved?.can_create ?? false,
          can_read: saved?.can_read ?? false,
          can_update: saved?.can_update ?? false,
          can_delete: saved?.can_delete ?? false,
        };
      });
      PAGES.forEach(page => {
        const key = makeKey(role.id, `page__${page.id}`);
        const saved = savedLookup[key];
        const defaultAccess = DEFAULT_PAGE_ACCESS[role.id]?.[page.id] ?? false;
        local[key] = {
          can_create: false,
          can_read: saved ? (saved.can_read ?? false) : defaultAccess,
          can_update: false,
          can_delete: false,
        };
      });
    });
    setLocalPerms(local);
    setDirty(false);
  }, [savedLookup]);

  const togglePerm = (role, entity, op) => {
    const key = makeKey(role, entity);
    setLocalPerms(prev => ({
      ...prev,
      [key]: { ...prev[key], [op]: !prev[key]?.[op] },
    }));
    setDirty(true);
  };

  const toggleAllForRole = (role, op) => {
    const allChecked = ENTITIES.every(e => localPerms[makeKey(role, e.id)]?.[op]);
    setLocalPerms(prev => {
      const next = { ...prev };
      ENTITIES.forEach(e => {
        const key = makeKey(role, e.id);
        next[key] = { ...next[key], [op]: !allChecked };
      });
      return next;
    });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const ops = [];
      const allItems = [
        ...ENTITIES.map(e => ({ id: e.id, entityKey: e.id })),
        ...PAGES.map(p => ({ id: `page__${p.id}`, entityKey: `page__${p.id}` })),
      ];
      ROLES.forEach(role => {
        allItems.forEach(item => {
          const key = makeKey(role.id, item.entityKey);
          const local = localPerms[key];
          const saved = savedLookup[key];
          if (saved) {
            if (
              saved.can_create !== local.can_create ||
              saved.can_read !== local.can_read ||
              saved.can_update !== local.can_update ||
              saved.can_delete !== local.can_delete
            ) {
              ops.push(base44.entities.RolePermission.update(saved.id, local));
            }
          } else {
            if (local.can_create || local.can_read || local.can_update || local.can_delete) {
              ops.push(base44.entities.RolePermission.create({
                role_name: role.id,
                entity_name: item.entityKey,
                ...local,
              }));
            }
          }
        });
      });
      await Promise.all(ops);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Behörigheter sparade');
      setDirty(false);
    },
    onError: (err) => {
      toast.error('Kunde inte spara: ' + err.message);
    },
  });

  const [selectedRole, setSelectedRole] = useState(ROLES[0].id);
  const [activeTab, setActiveTab] = useState('entities'); // 'entities' | 'pages'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8B1E1E]/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#8B1E1E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roller & Behörigheter</h1>
            <p className="text-sm text-gray-500">Hantera vad varje roll kan göra i systemet</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!dirty}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['role-permissions'] })}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Ångra
          </Button>
          <Button
            size="sm"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Spara ändringar
          </Button>
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 flex-wrap">
        {ROLES.map(role => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRole === role.id
                ? 'bg-[#8B1E1E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Entity / Pages tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('entities')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'entities'
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Database className="w-4 h-4" />
          Dataåtkomst
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'pages'
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          Sidåtkomst
        </button>
      </div>

      {activeTab === 'entities' && (
        <>
          {/* Quick toggle row */}
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Markera alla:</span>
            {OPERATIONS.map(op => {
              const allChecked = ENTITIES.every(e => localPerms[makeKey(selectedRole, e.id)]?.[op.id]);
              return (
                <button
                  key={op.id}
                  onClick={() => toggleAllForRole(selectedRole, op.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    allChecked
                      ? 'bg-[#8B1E1E]/10 text-[#8B1E1E] dark:bg-[#8B1E1E]/20 dark:text-red-300'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>

          {/* Entity permissions table */}
          <div className="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Entitet</th>
                    {OPERATIONS.map(op => (
                      <th key={op.id} className="text-center px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 w-24">
                        {op.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ENTITIES.map((entity, idx) => {
                    const key = makeKey(selectedRole, entity.id);
                    const perms = localPerms[key] || {};
                    const showGroup = idx === 0 || entity.group !== ENTITIES[idx - 1].group;
                    return (
                      <React.Fragment key={entity.id}>
                        {showGroup && (
                          <tr className="bg-gray-50/80 dark:bg-gray-800/40">
                            <td colSpan={5} className="px-4 py-2">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{entity.group}</span>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 pl-6">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{entity.label}</span>
                          </td>
                          {OPERATIONS.map(op => (
                            <td key={op.id} className="text-center px-4 py-3">
                              <Checkbox
                                checked={perms[op.id] ?? false}
                                onCheckedChange={() => togglePerm(selectedRole, entity.id, op.id)}
                              />
                            </td>
                          ))}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'pages' && (
        <>
          {/* Quick toggle for pages */}
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Markera alla:</span>
            {(() => {
              const allChecked = PAGES.every(p => localPerms[makeKey(selectedRole, `page__${p.id}`)]?.can_read);
              return (
                <button
                  onClick={() => {
                    setLocalPerms(prev => {
                      const next = { ...prev };
                      PAGES.forEach(p => {
                        const key = makeKey(selectedRole, `page__${p.id}`);
                        next[key] = { ...next[key], can_read: !allChecked, can_create: false, can_update: false, can_delete: false };
                      });
                      return next;
                    });
                    setDirty(true);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    allChecked
                      ? 'bg-[#8B1E1E]/10 text-[#8B1E1E] dark:bg-[#8B1E1E]/20 dark:text-red-300'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Visa
                </button>
              );
            })()}
          </div>

          {/* Page access table */}
          <div className="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Sida</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 w-24">Visa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {PAGES.map((page, idx) => {
                    const key = makeKey(selectedRole, `page__${page.id}`);
                    const perms = localPerms[key] || {};
                    const showGroup = idx === 0 || page.group !== PAGES[idx - 1].group;
                    const groupPages = PAGES.filter(p => p.group === page.group);
                    const allGroupChecked = groupPages.every(p => localPerms[makeKey(selectedRole, `page__${p.id}`)]?.can_read);
                    const someGroupChecked = !allGroupChecked && groupPages.some(p => localPerms[makeKey(selectedRole, `page__${p.id}`)]?.can_read);
                    return (
                      <React.Fragment key={page.id}>
                        {showGroup && (
                          <tr className="bg-gray-50/80 dark:bg-gray-800/40">
                            <td className="px-4 py-2">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{page.group}</span>
                            </td>
                            <td className="text-center px-4 py-2">
                              <Checkbox
                                checked={allGroupChecked}
                                indeterminate={someGroupChecked}
                                onCheckedChange={() => {
                                  setLocalPerms(prev => {
                                    const next = { ...prev };
                                    groupPages.forEach(p => {
                                      const k = makeKey(selectedRole, `page__${p.id}`);
                                      next[k] = { ...next[k], can_read: !allGroupChecked, can_create: false, can_update: false, can_delete: false };
                                    });
                                    return next;
                                  });
                                  setDirty(true);
                                }}
                              />
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 pl-6">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{page.label}</span>
                          </td>
                          <td className="text-center px-4 py-3">
                            <Checkbox
                              checked={perms.can_read ?? false}
                              onCheckedChange={() => {
                                setLocalPerms(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], can_read: !prev[key]?.can_read },
                                }));
                                setDirty(true);
                              }}
                            />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Obs: Ägare har alltid full behörighet och kan inte begränsas. Ändringar här påverkar appens mjuka behörighetskontroller.
      </p>
    </div>
  );
}