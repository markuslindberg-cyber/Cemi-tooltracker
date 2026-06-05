import React from 'react';
import { Shield, Check, X, Eye, Pencil, Trash2, Plus } from 'lucide-react';

const ROLES = [
  {
    name: 'Ägare',
    key: 'ägare',
    color: '#8B1E1E',
    desc: 'Högsta behörighetsnivå. Full tillgång till hela systemet inklusive ägarspecifika funktioner.',
    pages: [
      '/OwnerOverview', '/AdminLayoutEditor', '/Administration/Avskrivningar',
      '/Administration/RollBehorigheter', '/KnowledgeGraph',
      '+ alla övriga sidor'
    ],
    specialAccess: [
      'Ägaröversikt med samlad statistik',
      'Redigera navigationslayout för alla användare',
      'Hantera avskrivningsinställningar',
      'Roller & Behörigheter-sida',
      'Exportera all data (JSON)',
      'Knowledge Graph',
      'Skapa/radera GlobalAppConfig',
      'Permanent radering i papperskorgen',
    ],
    entities: {
      'Alla entiteter': { c: true, r: true, u: true, d: true },
      'GlobalAppConfig': { c: true, r: true, u: true, d: true },
      'RolePermission': { c: true, r: true, u: true, d: true },
      'DepreciationSetting': { c: true, r: true, u: true, d: true },
    },
  },
  {
    name: 'Admin',
    key: 'admin',
    color: '#2563eb',
    desc: 'Systemadministratör. Hanterar personal, platser, kategorier och maskiner. Kan inte hantera ägarspecifika inställningar.',
    pages: [
      '/Inventory', '/HandTools', '/Team', '/Locations',
      '/InventoryCheck', '/Administration/Kategorier',
      '/Administration/Papperskorg', '/Transfers', '/Service',
    ],
    specialAccess: [
      'Hantera personal (skapa, redigera, ta bort TeamMember)',
      'Hantera platser (Location CRUD)',
      'Hantera kategorier',
      'Godkänna lånförfrågningar',
      'Se alla verktygsloggar',
      'Importera maskiner',
    ],
    entities: {
      'Tool': { c: true, r: true, u: true, d: true },
      'HandTool': { c: true, r: true, u: true, d: true },
      'Location': { c: true, r: true, u: true, d: true },
      'TeamMember': { c: true, r: true, u: true, d: true },
      'Category': { c: true, r: true, u: true, d: true },
      'LoanRequest': { c: true, r: true, u: true, d: false },
      'ToolLog': { c: true, r: true, u: true, d: true },
      'LokalvardArtikelRequest': { c: false, r: true, u: true, d: true },
    },
  },
  {
    name: 'Admin Lokalvård',
    key: 'admin_lokalvård',
    color: '#7c3aed',
    desc: 'Ansvarar för arbetskläder, lokalvårdsartiklar och deras begäranden. Godkänner och lämnar ut artiklar.',
    pages: [
      '/Arbetsklader/Forfragan', '/Lokalvard/BegaranAttGodkanna',
      '/Lokalvard/NyttUttag', '/Lokalvard/Lager', '/Lokalvard/Uttag',
      '/Lokalvard/KostnadPerKund', '/Lokalvard/Kunder',
      '/Arbetsklader/Streckkodhantering', '/ArbetskladerUtrustning',
      '/Arbetsklader/CheckoutReports',
    ],
    specialAccess: [
      'Godkänna arbetskläder-begäranden',
      'Godkänna lokalvårdsartiklar-begäranden',
      'Plocka ut och kvittera uttag',
      'Hantera streckkoder på arbetskläder',
      'Hantera lokalvårdslager (priser, tröskelvärden)',
      'Hantera kunder',
      'Se kostnad per kund',
      'Se uttagsrapporter',
    ],
    entities: {
      'WorkwearRequest': { c: true, r: true, u: true, d: true },
      'LokalvardArtikelRequest': { c: true, r: true, u: true, d: true },
      'ArbetskläderUtrustning': { c: true, r: true, u: true, d: true },
      'LokalvardsArtikel': { c: true, r: true, u: true, d: true },
      'LokalvardCheckout': { c: true, r: true, u: true, d: true },
      'Uttag': { c: true, r: true, u: true, d: true },
      'Kund': { c: true, r: true, u: true, d: true },
      'Tool': { c: true, r: true, u: true, d: true },
      'HandTool': { c: true, r: true, u: true, d: true },
      'LoanRequest': { c: true, r: true, u: true, d: false },
    },
  },
  {
    name: 'Verktygsförvaltare',
    key: 'verktygsförvaltare',
    color: '#0891b2',
    desc: 'Hanterar maskininventering och handredskap. Kan registrera lånförfrågningar och utföra inventeringar.',
    pages: [
      '/Inventory', '/HandTools', '/InventoryCheck',
      '/InventoryReports', '/Transfers',
    ],
    specialAccess: [
      'Skapa och hantera maskiner (Tool CRUD)',
      'Skapa och hantera handredskap (HandTool CRUD)',
      'Registrera lånförfrågningar',
      'Utföra inventeringar',
      'Se verktygsloggar',
    ],
    entities: {
      'Tool': { c: true, r: true, u: true, d: false },
      'HandTool': { c: true, r: true, u: true, d: false },
      'LoanRequest': { c: true, r: true, u: true, d: false },
      'ToolLog': { c: true, r: true, u: false, d: false },
      'InventorySession': { c: true, r: true, u: true, d: false },
      'Location': { c: false, r: true, u: true, d: false },
      'TeamMember': { c: false, r: true, u: false, d: false },
      'Category': { c: false, r: true, u: false, d: false },
    },
  },
  {
    name: 'Lokalvårdare',
    key: 'lokalvårdare',
    color: '#16a34a',
    desc: 'Grundroll för lokalvårdspersonal. Kan skapa begäranden men INTE godkänna eller hantera lager.',
    pages: [
      '/ArbetskläderRequestWorkwear',
      '/LokalvardRequestArtikel',
    ],
    specialAccess: [
      'Skapa begäran för arbetskläder',
      'Skapa begäran för lokalvårdsartiklar',
      'Se egna begäranden',
    ],
    entities: {
      'WorkwearRequest': { c: true, r: true, u: false, d: false },
      'LokalvardArtikelRequest': { c: true, r: true, u: false, d: false },
      'LokalvardsArtikel': { c: false, r: true, u: false, d: false },
      'ArbetskläderUtrustning': { c: false, r: false, u: false, d: false },
      'Kund': { c: false, r: true, u: false, d: false },
    },
  },
];

const PermIcon = ({ allowed }) => allowed 
  ? <Check className="w-3.5 h-3.5 text-green-600" />
  : <X className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />;

export default function RolesTab() {
  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ROLES.map(role => (
          <div key={role.key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{role.name}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{role.desc}</p>
          </div>
        ))}
      </div>

      {/* Detailed per role */}
      {ROLES.map(role => (
        <div key={role.key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{role.name}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{role.key}</span>
          </div>

          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
            {/* Left: Accessible pages + special access */}
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tillgängliga sidor</h4>
                <div className="flex flex-wrap gap-1.5">
                  {role.pages.map((p, i) => (
                    <span key={i} className="text-[11px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Specialåtkomst</h4>
                <ul className="space-y-1">
                  {role.specialAccess.map((item, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Entity permissions table */}
            <div className="p-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Entitetsbehörigheter</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left py-1.5 pr-3 font-medium">Entitet</th>
                      <th className="px-2 py-1.5 font-medium"><Plus className="w-3 h-3 mx-auto" /></th>
                      <th className="px-2 py-1.5 font-medium"><Eye className="w-3 h-3 mx-auto" /></th>
                      <th className="px-2 py-1.5 font-medium"><Pencil className="w-3 h-3 mx-auto" /></th>
                      <th className="px-2 py-1.5 font-medium"><Trash2 className="w-3 h-3 mx-auto" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(role.entities).map(([entity, perms]) => (
                      <tr key={entity} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-1.5 pr-3 font-medium text-gray-700 dark:text-gray-300">{entity}</td>
                        <td className="px-2 py-1.5 text-center"><PermIcon allowed={perms.c} /></td>
                        <td className="px-2 py-1.5 text-center"><PermIcon allowed={perms.r} /></td>
                        <td className="px-2 py-1.5 text-center"><PermIcon allowed={perms.u} /></td>
                        <td className="px-2 py-1.5 text-center"><PermIcon allowed={perms.d} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}