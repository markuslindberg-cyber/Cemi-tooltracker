import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Mail, Database, Shield, ArrowRight, RefreshCw, Trash2, FileDown, Wrench } from 'lucide-react';

const FUNCTION_GROUPS = [
  {
    group: 'Lånhantering',
    icon: '🔧',
    functions: [
      { name: 'createLoanRequest', trigger: 'Frontend (/Transfers)', writes: ['LoanRequest'], emails: ['Godkännare', 'Destinationschef', 'Beställare'], roles: ['verktygsförvaltare', 'admin', 'admin_lokalvård', 'ägare'], desc: 'Skapar ny låneförfrågan med verktygslista, returndatum och godkännare. Skickar email till alla parter.' },
      { name: 'approveLoanRequest', trigger: 'Frontend (/Transfers)', writes: ['LoanRequest', 'Tool'], emails: ['Beställare', 'Godkännare', 'Destinationschef'], roles: ['approver_email', 'admin', 'admin_lokalvård', 'ägare'], desc: 'Godkänner/nekar lånbegäran. Stöder delgodkännande och justerat returndatum. Uppdaterar verktygens status vid godkännande.' },
      { name: 'returnLoanedTools', trigger: 'Frontend (/Transfers)', writes: ['LoanRequest'], emails: ['Godkännare', 'Beställare', 'Destinationschef'], roles: ['assigned_to', 'admin', 'ägare'], desc: 'Markerar lån som pending_return. Skickar email till godkännare att bekräfta mottagning.' },
      { name: 'confirmReturn', trigger: 'Frontend (/Transfers)', writes: ['LoanRequest', 'Tool', 'ToolLog'], emails: ['Låntagare', 'Godkännare', 'Beställare', 'Destinationschef'], roles: ['approver_email', 'admin', 'ägare'], desc: 'Bekräftar returen. Skapar ToolLog-post, uppdaterar verktygens plats och anteckningar.' },
      { name: 'extendLoanRequest', trigger: 'Frontend (/Transfers)', writes: ['LoanRequest'], emails: [], roles: ['requested_by', 'admin', 'ägare'], desc: 'Förlänger låneperioden med nytt returndatum.' },
      { name: 'cancelLoanRequest', trigger: 'Frontend (/Transfers)', writes: ['LoanRequest'], emails: [], roles: ['requested_by', 'admin', 'ägare'], desc: 'Avbryter en låneförfrågan.' },
      { name: 'sendLoanReminder', trigger: 'Frontend (/Transfers)', writes: [], emails: ['Alla parter i lånet'], roles: ['admin', 'ägare'], desc: 'Skickar manuell påminnelse-email till alla parter.' },
      { name: 'updateLoanReturnDate', trigger: 'Frontend', writes: ['LoanRequest'], emails: [], roles: ['admin', 'ägare'], desc: 'Uppdaterar returndatum på en befintlig lånbegäran.' },
    ],
  },
  {
    group: 'Arbetskläder',
    icon: '👔',
    functions: [
      { name: 'createWorkwearRequest', trigger: 'Frontend (/ArbetskläderRequestWorkwear)', writes: ['WorkwearRequest'], emails: ['Admin Lokalvård (alla)', 'Ägare'], roles: ['lokalvårdare', 'admin_lokalvård', 'ägare'], desc: 'Skapar arbetskläderbegäran med löpnummer. Skickar email till alla admin_lokalvård + ägare.' },
    ],
  },
  {
    group: 'Lokalvård',
    icon: '🧹',
    functions: [
      { name: 'createLokalvardRequest', trigger: 'Frontend (/LokalvardRequestArtikel)', writes: ['LokalvardArtikelRequest'], emails: ['Admin Lokalvård (alla)', 'Ägare'], roles: ['lokalvårdare', 'admin_lokalvård', 'ägare'], desc: 'Skapar begäran om lokalvårdsartiklar. Skickar email till admin_lokalvård + ägare.' },
      { name: 'createUttagFromCheckout', trigger: 'Frontend (/Lokalvard/NyttUttag)', writes: ['Uttag', 'LokalvardArtikelRequest'], emails: [], roles: ['admin_lokalvård', 'admin', 'ägare'], desc: 'Omvandlar godkänd begäran till Uttag-post. Beräknar priser per artikel och total kostnad.' },
      { name: 'notifyCheckoutComplete', trigger: 'Frontend', writes: [], emails: ['Beställaren'], roles: ['admin_lokalvård', 'admin', 'ägare'], desc: 'Skickar bekräftelsemail till beställaren att artiklarna är uttagna.' },
      { name: 'getLokalvardData', trigger: 'Frontend', writes: [], emails: [], roles: ['admin_lokalvård', 'ägare'], desc: 'Hämtar samlad data för lokalvårdsöversikt.' },
    ],
  },
  {
    group: 'Synkronisering & Loggning',
    icon: '🔄',
    functions: [
      { name: 'syncUsersToTeam', trigger: 'Manuell/Admin', writes: ['TeamMember'], emails: [], roles: ['admin'], desc: 'Synkar User-entiteten till TeamMember. Skapar saknade poster.' },
      { name: 'syncTeamMemberRoleToUser', trigger: 'Manuell/Admin', writes: ['User'], emails: [], roles: ['admin'], desc: 'Synkar roller från TeamMember tillbaka till User-entiteten.' },
      { name: 'createTeamMemberOnUserCreate', trigger: 'Automation (entity)', writes: ['TeamMember'], emails: [], roles: ['system'], desc: 'Skapar automatiskt TeamMember när ny User skapas.' },
      { name: 'logToolChange', trigger: 'Frontend/Automation', writes: ['ToolLog'], emails: [], roles: ['admin', 'verktygsförvaltare'], desc: 'Registrerar en ändring på ett verktyg i historikloggen.' },
      { name: 'setUserRole', trigger: 'Frontend', writes: ['User'], emails: [], roles: ['admin', 'ägare'], desc: 'Sätter roll på en användare.' },
    ],
  },
  {
    group: 'Verktyg & Import',
    icon: '📦',
    functions: [
      { name: 'processToolImport', trigger: 'Frontend (/Inventory/ToolImport)', writes: ['Tool'], emails: [], roles: ['admin', 'ägare'], desc: 'Importerar maskiner från CSV/Excel-fil.' },
      { name: 'processLokalvardInkopImport', trigger: 'Frontend', writes: ['LokalvardInköp', 'LokalvardsArtikel'], emails: [], roles: ['admin_lokalvård', 'ägare'], desc: 'Importerar lokalvårdsinköp från fil.' },
      { name: 'processUttagImport', trigger: 'Frontend', writes: ['Uttag'], emails: [], roles: ['admin_lokalvård', 'ägare'], desc: 'Importerar uttag från fil.' },
      { name: 'findToolImage', trigger: 'Frontend', writes: [], emails: [], roles: ['admin', 'verktygsförvaltare'], desc: 'Söker bildförslag för ett verktyg baserat på namn/tillverkare.' },
      { name: 'batchSearchToolImages', trigger: 'Frontend', writes: [], emails: [], roles: ['admin'], desc: 'Söker bilder för flera verktyg samtidigt.' },
      { name: 'findArticleForBarcode', trigger: 'Frontend', writes: [], emails: [], roles: ['admin_lokalvård'], desc: 'Hittar artikel baserat på streckkod.' },
    ],
  },
  {
    group: 'Administration & Underhåll',
    icon: '⚙️',
    functions: [
      { name: 'exportAllData', trigger: 'Frontend (/OwnerOverview)', writes: [], emails: [], roles: ['ägare'], desc: 'Exporterar hela databasen som JSON-fil.' },
      { name: 'permanentDeleteTrash', trigger: 'Frontend (/Papperskorg)', writes: ['Tool', 'HandTool', 'ArbetskläderUtrustning', 'LokalvardsArtikel'], emails: [], roles: ['admin', 'ägare'], desc: 'Permanent raderar mjukraderade artiklar.' },
      { name: 'deleteCategory', trigger: 'Frontend', writes: ['Category'], emails: [], roles: ['admin', 'ägare'], desc: 'Tar bort en kategori.' },
      { name: 'updateCategoryName', trigger: 'Frontend', writes: ['Category', 'Tool', 'HandTool', 'ArbetskläderUtrustning'], emails: [], roles: ['admin', 'ägare'], desc: 'Byter namn på en kategori och uppdaterar alla relaterade entiteter.' },
      { name: 'updateSubcategoryName', trigger: 'Frontend', writes: ['Category', 'Tool', 'HandTool', 'ArbetskläderUtrustning'], emails: [], roles: ['admin', 'ägare'], desc: 'Byter namn på en underkategori.' },
      { name: 'getCategoryCounts', trigger: 'Frontend', writes: [], emails: [], roles: ['admin', 'ägare'], desc: 'Räknar antal artiklar per kategori.' },
      { name: 'deactivateUserAndTransferData', trigger: 'Frontend', writes: ['User', 'Tool', 'HandTool'], emails: [], roles: ['admin'], desc: 'Inaktiverar användare och flyttar tilldelade verktyg.' },
      { name: 'inactivateUser', trigger: 'Frontend', writes: ['User', 'TeamMember'], emails: [], roles: ['admin'], desc: 'Inaktiverar en användare.' },
      { name: 'permanentlyDeleteUser', trigger: 'Frontend', writes: ['User', 'TeamMember'], emails: [], roles: ['admin'], desc: 'Tar permanent bort en användare.' },
    ],
  },
  {
    group: 'Datarensning (engångs)',
    icon: '🧹',
    functions: [
      { name: 'cleanupToolData', trigger: 'Manuell', writes: ['Tool'], emails: [], roles: ['admin'], desc: 'Rensar upp felaktig data på verktyg.' },
      { name: 'deduplicateTools', trigger: 'Manuell', writes: ['Tool'], emails: [], roles: ['admin'], desc: 'Tar bort dubbletter av verktyg.' },
      { name: 'deduplicateArticles', trigger: 'Manuell', writes: ['LokalvardsArtikel'], emails: [], roles: ['admin'], desc: 'Tar bort dubbletter av artiklar.' },
      { name: 'migrateToolCategories', trigger: 'Manuell', writes: ['Tool', 'Category'], emails: [], roles: ['admin'], desc: 'Migrerar kategorier till ny struktur.' },
    ],
  },
];

export default function BackendFunctionsTab() {
  const [search, setSearch] = useState('');
  const q = search.toLowerCase();

  const filtered = FUNCTION_GROUPS.map(g => ({
    ...g,
    functions: g.functions.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.desc.toLowerCase().includes(q) ||
      f.writes.some(w => w.toLowerCase().includes(q))
    ),
  })).filter(g => g.functions.length > 0);

  const totalFunctions = FUNCTION_GROUPS.reduce((sum, g) => sum + g.functions.length, 0);

  return (
    <div className="space-y-6">
      {/* Search + stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Sök funktion, entitet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">{totalFunctions} funktioner</span>
          <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">{FUNCTION_GROUPS.length} grupper</span>
        </div>
      </div>

      {/* Function groups */}
      {filtered.map(group => (
        <div key={group.group} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span className="text-lg">{group.icon}</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{group.group}</h3>
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{group.functions.length}</span>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {group.functions.map(fn => (
              <div key={fn.name} className="px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <code className="text-sm font-bold text-purple-700 dark:text-purple-400">{fn.name}</code>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{fn.desc}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                  {/* Trigger */}
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <ArrowRight className="w-3 h-3" />
                    <span>{fn.trigger}</span>
                  </div>

                  {/* Writes to */}
                  {fn.writes.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <Database className="w-3 h-3 text-blue-500" />
                      {fn.writes.map((w, i) => (
                        <span key={i} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Emails */}
                  {fn.emails.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <Mail className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-700 dark:text-amber-400">{fn.emails.join(', ')}</span>
                    </div>
                  )}

                  {/* Roles */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <Shield className="w-3 h-3 text-cyan-500" />
                    {fn.roles.map((r, i) => (
                      <span key={i} className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Inga funktioner matchar sökningen.</p>
      )}
    </div>
  );
}