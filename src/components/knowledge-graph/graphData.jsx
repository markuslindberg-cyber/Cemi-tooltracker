// Knowledge graph data – all nodes and edges for the ToolTrack system

export const CATEGORIES = {
  workflow: { label: 'Arbetsflöde', color: '#8B1E1E', bg: '#8B1E1E15' },
  entity: { label: 'Entitet', color: '#2563eb', bg: '#2563eb15' },
  function: { label: 'Backend-funktion', color: '#7c3aed', bg: '#7c3aed15' },
  role: { label: 'Roll', color: '#0891b2', bg: '#0891b215' },
  email: { label: 'Email-notis', color: '#d97706', bg: '#d9770615' },
  page: { label: 'Sida i appen', color: '#16a34a', bg: '#16a34a15' },
};

export const NODES = [
  // === WORKFLOWS ===
  { id: 'wf_loan', label: 'Lånflöde', cat: 'workflow', desc: 'Komplett flöde för lån av maskiner: begäran → godkännande → lån → retur → bekräftelse.' },
  { id: 'wf_workwear', label: 'Arbetskläder-flöde', cat: 'workflow', desc: 'Begäran om arbetskläder/skyddsutrustning → godkännande → scanning → utlämning.' },
  { id: 'wf_lokalvard', label: 'Lokalvårdsartiklar-flöde', cat: 'workflow', desc: 'Begäran om lokalvårdsartiklar → godkännande → uttag → fakturering per kund.' },

  // === ENTITIES ===
  { id: 'e_loanrequest', label: 'LoanRequest', cat: 'entity', desc: 'Låneförfrågan med status: pending → approved → pending_return → returned.' },
  { id: 'e_tool', label: 'Tool', cat: 'entity', desc: 'Maskiner och redskap med status, plats, streckkod och avskrivning.' },
  { id: 'e_handtool', label: 'HandTool', cat: 'entity', desc: 'Handredskap med plats, status och streckkod.' },
  { id: 'e_workwearrequest', label: 'WorkwearRequest', cat: 'entity', desc: 'Begäran om arbetskläder, status: pending → approved → completed.' },
  { id: 'e_arbetsklader', label: 'ArbetskläderUtrustning', cat: 'entity', desc: 'Lager av arbetskläder och skyddsutrustning med storlek, streckkod, plats.' },
  { id: 'e_lokalvardrequest', label: 'LokalvardArtikelRequest', cat: 'entity', desc: 'Begäran om uttag av lokalvårdsartiklar.' },
  { id: 'e_lokalvardsartikel', label: 'LokalvardsArtikel', cat: 'entity', desc: 'Artiklar i lokalvårdslager med pris, streckkod, tröskelvärde.' },
  { id: 'e_uttag', label: 'Uttag', cat: 'entity', desc: 'Registrerade uttag av lokalvårdsartiklar med kostnad per kund/månad.' },
  { id: 'e_checkout', label: 'LokalvardCheckout', cat: 'entity', desc: 'Utlämningspost kopplad till godkänd begäran (arbetskläder).' },
  { id: 'e_location', label: 'Location', cat: 'entity', desc: 'Platser (arbetsplats, lager, fordon) med ansvarig person.' },
  { id: 'e_teammember', label: 'TeamMember', cat: 'entity', desc: 'Personal i systemet med roll, plats, emailprenumeration.' },
  { id: 'e_kund', label: 'Kund', cat: 'entity', desc: 'Kunder (Cemi, PHM, BRF, m.fl.) med projektnummer.' },
  { id: 'e_toollog', label: 'ToolLog', cat: 'entity', desc: 'Historiklogg för alla ändringar på maskiner.' },
  { id: 'e_servicerecord', label: 'ServiceRecord', cat: 'entity', desc: 'Servicelogg för maskiner och utrustning.' },
  { id: 'e_huvudmaskin', label: 'Huvudmaskin', cat: 'entity', desc: 'Traktorer, lastbilar och andra huvudmaskiner.' },
  { id: 'e_category', label: 'Category', cat: 'entity', desc: 'Kategorier och underkategorier för alla entitetstyper.' },
  { id: 'e_inventorysession', label: 'InventorySession', cat: 'entity', desc: 'Inventeringssessioner med skannade artiklar.' },

  // === FUNCTIONS ===
  { id: 'fn_createLoan', label: 'createLoanRequest', cat: 'function', desc: 'Skapar låneförfrågan → skickar email till godkännare + destinationschef + bekräftelse till beställare.' },
  { id: 'fn_approveLoan', label: 'approveLoanRequest', cat: 'function', desc: 'Godkänner/nekar lån → skickar email till alla parter. Stöder delgodkännande och justerat returndatum.' },
  { id: 'fn_returnTools', label: 'returnLoanedTools', cat: 'function', desc: 'Markerar maskiner som returnerade (pending_return) → skickar email till godkännare att bekräfta mottagning.' },
  { id: 'fn_confirmReturn', label: 'confirmReturn', cat: 'function', desc: 'Bekräftar mottagning → skapar ToolLog → uppdaterar verktygsanteckningar → email till alla parter.' },
  { id: 'fn_extendLoan', label: 'extendLoanRequest', cat: 'function', desc: 'Förlänger låneperiod med nytt returndatum.' },
  { id: 'fn_cancelLoan', label: 'cancelLoanRequest', cat: 'function', desc: 'Avbryter låneförfrågan.' },
  { id: 'fn_sendReminder', label: 'sendLoanReminder', cat: 'function', desc: 'Skickar påminnelse-email till alla parter i en låneförfrågan.' },
  { id: 'fn_createWorkwear', label: 'createWorkwearRequest', cat: 'function', desc: 'Skapar arbetskläderbegäran → skickar email till admin_lokalvård + ägare.' },
  { id: 'fn_createLokalvard', label: 'createLokalvardRequest', cat: 'function', desc: 'Skapar lokalvårdsartikelbegäran → skickar email till admins.' },
  { id: 'fn_createUttag', label: 'createUttagFromCheckout', cat: 'function', desc: 'Skapar Uttag-post från godkänd utlämning, beräknar pris per artikel.' },
  { id: 'fn_notifyCheckout', label: 'notifyCheckoutComplete', cat: 'function', desc: 'Skickar email till beställaren att artiklarna är uttagna.' },
  { id: 'fn_logChange', label: 'logToolChange', cat: 'function', desc: 'Registrerar ändringar på ett verktyg i ToolLog.' },
  { id: 'fn_syncUsers', label: 'syncUsersToTeam', cat: 'function', desc: 'Synkar användare till TeamMember-entiteten.' },
  { id: 'fn_syncRoles', label: 'syncTeamMemberRoleToUser', cat: 'function', desc: 'Synkar roller från TeamMember tillbaka till User.' },
  { id: 'fn_exportData', label: 'exportAllData', cat: 'function', desc: 'Exporterar all data i systemet som JSON-fil (ägare).' },

  // === ROLES ===
  { id: 'r_lokalvardare', label: 'Lokalvårdare', cat: 'role', desc: 'Kan skapa begäranden för arbetskläder och lokalvårdsartiklar. Kan INTE godkänna.' },
  { id: 'r_admin_lok', label: 'Admin Lokalvård', cat: 'role', desc: 'Kan godkänna begäranden, hantera uttag, streckkoder, lager. Hanterar kunder.' },
  { id: 'r_verktygsfv', label: 'Verktygsförvaltare', cat: 'role', desc: 'Hanterar inventering av maskiner och handredskap. Kan registrera lånförfrågor.' },
  { id: 'r_admin', label: 'Admin', cat: 'role', desc: 'Full systemåtkomst. Hanterar personal, platser och kategorier.' },
  { id: 'r_agare', label: 'Ägare', cat: 'role', desc: 'Tillgång till ALLT: ägaröversikt, rollhantering, avskrivningar, layout-editor, dataexport.' },

  // === EMAILS ===
  { id: 'em_new_loan', label: 'Ny lånförfrågan', cat: 'email', desc: 'Skickas till godkännare, destinationschef + bekräftelse till beställare.' },
  { id: 'em_loan_decision', label: 'Godkänd/Nekad lån', cat: 'email', desc: 'Skickas till beställare, godkännare och destinationschef.' },
  { id: 'em_return_pending', label: 'Retur väntar', cat: 'email', desc: 'Skickas till godkännare (bekräfta mottagning), beställare och destinationschef.' },
  { id: 'em_return_confirmed', label: 'Retur bekräftad', cat: 'email', desc: 'Skickas till låntagare, godkännare, beställare och destinationschef.' },
  { id: 'em_new_workwear', label: 'Ny arbetskläderbegäran', cat: 'email', desc: 'Skickas till alla admin_lokalvård + ägare.' },
  { id: 'em_new_lokalvard', label: 'Ny lokalvårdsbegäran', cat: 'email', desc: 'Skickas till alla admin_lokalvård + ägare.' },
  { id: 'em_checkout_done', label: 'Uttag slutfört', cat: 'email', desc: 'Skickas till beställaren att artiklarna är uttagna.' },
  { id: 'em_reminder', label: 'Påminnelse', cat: 'email', desc: 'Skickas till alla parter i en låneförfrågan.' },

  // === PAGES ===
  { id: 'p_transfers', label: '/Transfers', cat: 'page', desc: 'Lån av utrustning – skapa, godkänna, returnera.' },
  { id: 'p_workwear_req', label: '/ArbetskläderRequestWorkwear', cat: 'page', desc: 'Formulär för att begära arbetskläder.' },
  { id: 'p_workwear_approve', label: '/Arbetsklader/Forfragan', cat: 'page', desc: 'Godkänna arbetskläder-begäranden + scanning + utlämning.' },
  { id: 'p_lokalvard_req', label: '/LokalvardRequestArtikel', cat: 'page', desc: 'Formulär för att begära lokalvårdsartiklar.' },
  { id: 'p_lokalvard_approve', label: '/Lokalvard/BegaranAttGodkanna', cat: 'page', desc: 'Godkänna lokalvårdsartikelbegäranden.' },
  { id: 'p_lokalvard_uttag', label: '/Lokalvard/NyttUttag', cat: 'page', desc: 'Plocka ut begärda uttag – scanning och kvittering.' },
  { id: 'p_inventory', label: '/Inventory', cat: 'page', desc: 'Maskinöversikt med alla verktyg.' },
  { id: 'p_handtools', label: '/HandTools', cat: 'page', desc: 'Hantering av handredskap.' },
  { id: 'p_inventorycheck', label: '/InventoryCheck', cat: 'page', desc: 'Inventering av maskiner och handredskap.' },
  { id: 'p_owner', label: '/OwnerOverview', cat: 'page', desc: 'Ägaröversikt – samlad statistik + dataexport.' },
];

export const EDGES = [
  // === LOAN WORKFLOW ===
  { from: 'wf_loan', to: 'fn_createLoan', label: 'startar' },
  { from: 'fn_createLoan', to: 'e_loanrequest', label: 'skapar' },
  { from: 'fn_createLoan', to: 'em_new_loan', label: 'skickar' },
  { from: 'e_loanrequest', to: 'fn_approveLoan', label: 'godkänns/nekas' },
  { from: 'fn_approveLoan', to: 'em_loan_decision', label: 'skickar' },
  { from: 'e_loanrequest', to: 'fn_returnTools', label: 'returneras' },
  { from: 'fn_returnTools', to: 'em_return_pending', label: 'skickar' },
  { from: 'e_loanrequest', to: 'fn_confirmReturn', label: 'bekräftas' },
  { from: 'fn_confirmReturn', to: 'e_toollog', label: 'loggar' },
  { from: 'fn_confirmReturn', to: 'em_return_confirmed', label: 'skickar' },
  { from: 'e_loanrequest', to: 'fn_extendLoan', label: 'förlängs' },
  { from: 'e_loanrequest', to: 'fn_cancelLoan', label: 'avbryts' },
  { from: 'e_loanrequest', to: 'fn_sendReminder', label: 'påminnelse' },
  { from: 'fn_sendReminder', to: 'em_reminder', label: 'skickar' },
  { from: 'e_loanrequest', to: 'e_tool', label: 'refererar till' },
  { from: 'e_loanrequest', to: 'e_location', label: 'destination' },
  { from: 'p_transfers', to: 'wf_loan', label: 'hanterar' },

  // === WORKWEAR WORKFLOW ===
  { from: 'wf_workwear', to: 'fn_createWorkwear', label: 'startar' },
  { from: 'fn_createWorkwear', to: 'e_workwearrequest', label: 'skapar' },
  { from: 'fn_createWorkwear', to: 'em_new_workwear', label: 'skickar' },
  { from: 'e_workwearrequest', to: 'e_checkout', label: 'utlämning' },
  { from: 'e_checkout', to: 'e_arbetsklader', label: 'minskar lager' },
  { from: 'p_workwear_req', to: 'wf_workwear', label: 'formulär' },
  { from: 'p_workwear_approve', to: 'e_workwearrequest', label: 'godkänner' },

  // === LOKALVÅRD WORKFLOW ===
  { from: 'wf_lokalvard', to: 'fn_createLokalvard', label: 'startar' },
  { from: 'fn_createLokalvard', to: 'e_lokalvardrequest', label: 'skapar' },
  { from: 'fn_createLokalvard', to: 'em_new_lokalvard', label: 'skickar' },
  { from: 'e_lokalvardrequest', to: 'fn_createUttag', label: 'utförs' },
  { from: 'fn_createUttag', to: 'e_uttag', label: 'skapar' },
  { from: 'fn_createUttag', to: 'e_lokalvardsartikel', label: 'minskar lager' },
  { from: 'e_uttag', to: 'e_kund', label: 'kostnad per' },
  { from: 'fn_notifyCheckout', to: 'em_checkout_done', label: 'skickar' },
  { from: 'p_lokalvard_req', to: 'wf_lokalvard', label: 'formulär' },
  { from: 'p_lokalvard_approve', to: 'e_lokalvardrequest', label: 'godkänner' },
  { from: 'p_lokalvard_uttag', to: 'fn_createUttag', label: 'anropar' },

  // === ROLE → WORKFLOW ACCESS ===
  { from: 'r_lokalvardare', to: 'p_workwear_req', label: 'kan använda' },
  { from: 'r_lokalvardare', to: 'p_lokalvard_req', label: 'kan använda' },
  { from: 'r_admin_lok', to: 'p_workwear_approve', label: 'kan använda' },
  { from: 'r_admin_lok', to: 'p_lokalvard_approve', label: 'kan använda' },
  { from: 'r_admin_lok', to: 'p_lokalvard_uttag', label: 'kan använda' },
  { from: 'r_verktygsfv', to: 'p_transfers', label: 'kan använda' },
  { from: 'r_verktygsfv', to: 'p_inventory', label: 'kan använda' },
  { from: 'r_verktygsfv', to: 'p_inventorycheck', label: 'kan använda' },
  { from: 'r_agare', to: 'p_owner', label: 'kan använda' },

  // === SYNC & LOGGING ===
  { from: 'fn_syncUsers', to: 'e_teammember', label: 'synkar' },
  { from: 'fn_syncRoles', to: 'e_teammember', label: 'synkar' },
  { from: 'fn_logChange', to: 'e_toollog', label: 'skapar' },
  { from: 'fn_exportData', to: 'p_owner', label: 'tillgänglig via' },

  // === ENTITY RELATIONS ===
  { from: 'e_tool', to: 'e_location', label: 'tillhör' },
  { from: 'e_tool', to: 'e_teammember', label: 'tilldelad' },
  { from: 'e_tool', to: 'e_huvudmaskin', label: 'kopplad till' },
  { from: 'e_tool', to: 'e_servicerecord', label: 'har service' },
  { from: 'e_handtool', to: 'e_location', label: 'tillhör' },
  { from: 'e_arbetsklader', to: 'e_location', label: 'tillhör' },
  { from: 'e_teammember', to: 'e_location', label: 'jobbar på' },
  { from: 'e_tool', to: 'e_category', label: 'kategoriserad' },
  { from: 'e_handtool', to: 'e_category', label: 'kategoriserad' },
  { from: 'e_arbetsklader', to: 'e_category', label: 'kategoriserad' },
  { from: 'e_inventorysession', to: 'e_tool', label: 'inventerar' },
  { from: 'e_inventorysession', to: 'e_handtool', label: 'inventerar' },
  { from: 'p_inventorycheck', to: 'e_inventorysession', label: 'skapar' },
];