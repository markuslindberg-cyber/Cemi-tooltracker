# ToolTracker – migreringsdokumentation (Base44 → Lovable + Supabase)

> Underlaget kommer från appens källkod, entitetsscheman och workflows (läst 2026-10-14).
> **"oklart"** betyder att något inte kunde verifieras i koden.
> All källkod finns i kodexporten: `base44/functions/<namn>/entry.ts`, `base44/entities/*.jsonc`, `base44/workflows/*.jsonc`, `src/**`.

---

## 1. SIDOR OCH ROLLER

### Roller (User.role)
`ägare`, `admin`, `mekaniker`, `verktygsförvaltare`, `admin_lokalvård`, `lokalvårdare`, `user` (standard).
TeamMember.role har även: `technician`, `apprentice`, `contractor`, `admin lokalvård` (med mellanslag) – synkas till User via `syncTeamMemberRoleToUser`.

Menykonstanter (`src/Layout.jsx`):
```js
const LOKALVARDARE_ROLES = ['lokalvårdare', 'admin_lokalvård', 'ägare'];
const NOT_LOKALVARDARE   = ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'];
```
OBS: `mekaniker` finns inte i `NOT_LOKALVARDARE`, så menyn döljer de grupperna för mekaniker, men RLS ger mekaniker åtkomst till datan. Om det är avsiktligt är **oklart**.

Menyn filtreras dessutom per enhet (`GlobalAppConfig.unit_navigation_config`) och ordnas via `GlobalAppConfig.navigation_order`. Menyposter med `devOnly` visas bara på `*.base44.app`, och `desktopOnly` bara när skärmen är minst 1024 px bred.

### Routes
| Route | Komponent | Synlig i menyn för | Funktion |
|---|---|---|---|
| `/` | Dashboard | alla | Widgets per roll/enhet, skanna/sök |
| `/Inventory` | Inventory | NOT_LOKALVARDARE | Maskiner: lista, filter, ofullständiga poster, bulkredigering |
| `/Huvudmaskiner` | Huvudmaskiner | NOT_LOKALVARDARE | Huvudmaskiner och kompatibla tillbehör |
| `/Inventory/SaldaRedskap` | SåldaRedskap | NOT_LOKALVARDARE | Sålda och kasserade maskiner |
| `/Transfers` | LoanRequests | NOT_LOKALVARDARE | Lån av utrustning |
| `/Service` | ServicePage | NOT_LOKALVARDARE | Serviceposter |
| `/ServiceMallar` | ServiceMallar | (ingen menypost) | Servicemallar |
| `/Inventory/ToolImport` | ToolImport | NOT_LOKALVARDARE, desktop, dev | Import av maskiner från fil |
| `/HandTools` | HandTools | NOT_LOKALVARDARE | Handredskap |
| `/ArbetskladerUtrustning` | ArbetskläderUtrustning | NOT_LOKALVARDARE | Lager för arbetskläder |
| `/Arbetsklader/CheckoutReports` | CheckoutReports | NOT_LOKALVARDARE | Uttagsrapporter |
| `/ArbetskläderRequestWorkwear` | ArbetskläderRequestWorkwear | alla med menyn Arbetskläder | Begär arbetskläder |
| `/Arbetsklader/Forfragan` | ArbetskladerBegaranAttGodkanna | admin_lokalvård, ägare | Godkänn klädbegäran |
| `/Arbetsklader/Streckkodhantering` | ArbetskläderStreckkodhantering | admin_lokalvård, ägare | Streckkoder |
| `/RequestWorkwear` | RequestWorkwear | (ingen menypost) | Äldre begäransida, **oklart** om den används |
| `/LokalvardRequestArtikel` | LokalvardRequestArtikel | LOKALVARDARE_ROLES | Begär lokalvårdsartiklar |
| `/Lokalvard/Lager` | LokalvardLager | admin_lokalvård, ägare | Lager och saldo |
| `/Lokalvard/NyttUttag` | LokalvardNyttUttag | admin_lokalvård, ägare | Plocka ut begärda artiklar |
| `/Lokalvard/Uttag` | LokalvardUttag | admin_lokalvård, ägare | Uttagshistorik |
| `/Lokalvard/BegaranAttGodkanna` | LokalvardBegaranAttGodkanna | admin_lokalvård, ägare | Godkänn begäran |
| `/Lokalvard/KostnadPerKund` | LokalvardKostnadPerKund | admin_lokalvård, ägare | Kostnad per kund |
| `/Lokalvard/Kunder` | LokalvardKunder | admin_lokalvård, ägare | Kunder |
| `/Lokalvard/Produktstatistik` | LokalvardProduktstatistik | admin_lokalvård, ägare | Statistik och beställningsförslag |
| `/Lokalvard/Inkopshistorik` | LokalvardInkopshistorik | admin_lokalvård, ägare | Inköp |
| `/Lokalvard/OmatchadeInkop` | LokalvardOmatchadeInkop | admin_lokalvård, ägare | Inköp/uttag som inte matchats |
| `/Lokalvard/Fakturering` | LokalvardFakturering | admin_lokalvård, ägare | Faktureringsunderlag |
| `/Lokalvard/InköpImport`, `/Lokalvard/UttagImport`, `/Lokalvard/ImportHistorik` | importsidor | (ingen menypost) | Filimport |
| `/Lokalvard/Artikel/:artikelnummer` | LokalvardArtikelDetaljer | – | Artikeldetaljer |
| `/InventoryCheck` | InventoryCheck | NOT_LOKALVARDARE | Inventering genom skanning |
| `/InventoryReports` | InventoryReports | NOT_LOKALVARDARE | Inventeringsrapporter |
| `/InventeringsManual` | InventeringsManual | NOT_LOKALVARDARE | Manual |
| `/Materialbanken` | Materialbanken | NOT_LOKALVARDARE | Materiallager |
| `/Materialbanken/Uttag` | MaterialUttagHistorik | NOT_LOKALVARDARE | Materialuttag |
| `/ITUtrustning` | ITUtrustning | ägare | IT-lager med flikarna I lager, Används och Övrigt |
| `/Locations`, `/locations/:locationId` | Locations, LocationDetails | NOT_LOKALVARDARE | Platser |
| `/Team` | Team | NOT_LOKALVARDARE | Personal, inbjudningar och roller |
| `/Administration/Kategorier` | CategoryManagement | NOT_LOKALVARDARE | Kategorier |
| `/Administration/Papperskorg` | Papperskorg | desktop, dev | Mjukraderade poster |
| `/Administration/Enheter` | UnitsAdmin | ägare | Enheter och menyer per enhet |
| `/Administration/Etiketter` | Etiketter | ägare | QR-/streckkodsetiketter, utskrift |
| `/Administration/RollBehorigheter` | RollBehorigheter | ägare | Matrisen RolePermission |
| `/Administration/Avskrivningar` | DepreciationSettings | ägare | Avskrivningsnivåer |
| `/OwnerOverview` | OwnerOverview | ägare | Totalvärden per område |
| `/NavInstellningar`, `/AdminLayoutEditor` | – | (ingen menypost) | Menyordning och layout |
| `/KnowledgeGraph` | KnowledgeGraph | (ingen menypost) | Kunskapsgraf |
| `/Dashboard`, `/Inventory`, `/InventoryCheck`, `/Locations`, `/Team`, `/Transfers` | via pages.config | – | Samma sidor som ovan |

Sidspärrar: sidorna Etiketter, IT-utrustning och Enheter kontrollerar rollen `ägare` i komponenten. Om övriga sidor har egna spärrar utöver menyn och RLS har inte granskats sida för sida, alltså **oklart**.

---

## 2. ANVÄNDARFLÖDEN

### 2.1 Lån av maskiner (LoanRequest)
1. **Start:** inloggad användare via LoanRequestModal (`/Transfers` eller maskinkort). Användaren väljer maskiner, mottagare, destinationsplats, standardåterlämningsdatum, eventuellt datum per maskin, och kommentar.
2. Frontend anropar `createLoanRequest`. Servern hämtar maskin- och platsdata själv och litar inte på klientens värden. Godkännaren blir platsens ansvariga person.
3. Skapar `LoanRequest` med `status=pending`. Mejl går till godkännaren.
4. Godkännaren anropar `approveLoanRequest`, som sätter status `approved` eller `rejected`, `approval_date` och `approver_comment`, och mejlar parterna. Om maskinernas plats och tilldelning uppdateras vid godkännandet är **oklart**: funktionen skriver bara LoanRequest.
5. Förlängning via `extendLoanRequest` skapar en **ny** LoanRequest med `is_extension_request=true` och `original_request_id`, plus mejl.
6. Tidigareläggning via `updateLoanReturnDate` ändrar `default_return_date` direkt och mejlar godkännaren. Tillåtet för tilldelad person, beställare, admin och ägare.
7. Återlämning via `returnLoanedTools` sätter `status=pending_return` och mejlar.
8. Bekräftelse via `confirmReturn` sätter `status=returned`, `return_confirmed_*` och `returned_date`, uppdaterar Tool (plats och tilldelning), skapar `ToolLog` och skickar mejl.
9. Avbryt via `cancelLoanRequest`. Påminnelse via `sendLoanReminder` (manuell knapp, inte schemalagd).

Statusövergångar: `pending → approved | rejected`, `approved → pending_return → returned`.

### 2.2 Lokalvårdsartiklar
1. Lokalvårdare skapar en begäran (`/LokalvardRequestArtikel`) via `createLokalvardRequest`: `LokalvardArtikelRequest` med löpnummer och mejl till admin.
2. Admin lokalvård godkänner (`/Lokalvard/BegaranAttGodkanna`) och plockar ut med skanning (`/Lokalvard/NyttUttag`), vilket skapar `LokalvardCheckout`.
3. `createUttagFromCheckout` skapar `Uttag` (artiklar, pris per enhet, total_kostnad, manad=YYYY-MM).
4. `notifyCheckoutComplete` mejlar beställaren (roller: admin_lokalvård, admin, mekaniker, ägare).
5. Saldot beräknas utifrån inköp (`LokalvardInköp`) minus uttag (`src/lib/calculateArtikelSaldo.js`).

### 2.3 Arbetskläder
Begäran via `createWorkwearRequest` skapar `WorkwearRequest` (pending), med löpnummer och mejl. Godkännande sker på `/Arbetsklader/Forfragan` (`approved/rejected/completed`). Uttag skapar `CheckoutReport`. Exakta mejlmottagare finns i funktionens kod, se avsnitt 3.

### 2.4 Materialbanken
Uttag via `createMaterialUttag`: servern minskar `MaterialLager.antal` och skapar `MaterialUttag` (typ `uttag`).

### 2.5 Inventering
`InventorySession` skapas med status `pågående`, kan pausas (`pausad`) och avslutas (`avslutad`), vilket skapar `InventoryReport` med kontrollerade och okontrollerade artiklar. Lagerkorrigeringar loggas i `corrections`.

### 2.6 Personal och användare
- Inbjudan: `inviteUserAsService` (roll mot tillåtelselista, mejl).
- Användare som skapas: `createTeamMemberOnUserCreate` och den schemalagda `syncUsersToTeam` (var 5:e minut) skapar och synkar TeamMember.
- Rolländring: `setUserRole`, samt den entity-triggade `syncTeamMemberRoleToUser`.
- Avslut: `inactivateUser` eller `deactivateUserAndTransferData`, som för över Tool, HandTool, Location och LoanRequest till en ersättare. `permanentlyDeleteUser` raderar TeamMember.

### 2.7 IT-utrustning (bara ägare)
Registrering sker i ITFormModal. Streckkoden genereras som `IT-000001` och uppåt (`nextITCode`). Status ändras manuellt. Modalerna OnboardModal och OffboardModal finns kvar men knapparna är borttagna.

### 2.8 Etiketter
Ägaren väljer kategori, format (QR eller streckkod) och storlek i mm, markerar poster och skriver ut via `window.print()` med print-CSS. Poster som skapats de senaste 7 dagarna märks "Ny".

### 2.9 Papperskorg
Mjukradering sätter `is_deleted=true` och `deleted_at`. Ett schemalagt jobb raderar posterna permanent efter 30 dagar.

---

## 3. BACKEND-FUNKTIONER

Gemensamt: alla använder `createClientFromRequest(req)`. **Inga** miljövariabler läses (`Deno.env` används inte). Hemligheten `FIRECRAWL_API_KEY` finns satt men används inte i någon funktion. `base44/shared/emailSafe.ts` exporterar `APP_URL`, `escapeHtml` och `escapeDeep`.

Trigger: **F** = frontend (`base44.functions.invoke`), **E** = entity-workflow, **S** = schemalagd, **M** = bara manuellt/underhåll (anropas inte från UI).

| Funktion | Trigger | Läser | Skriver | Integration |
|---|---|---|---|---|
| approveLoanRequest | F | LoanRequest, TeamMember | LoanRequest | SendEmail |
| cancelLoanRequest | F | LoanRequest | LoanRequest | SendEmail |
| confirmReturn | F | LoanRequest, TeamMember, Tool | LoanRequest, Tool, ToolLog | SendEmail |
| createLoanRequest | F | Tool, HandTool, Location, TeamMember | LoanRequest | SendEmail |
| extendLoanRequest | F | LoanRequest, TeamMember | LoanRequest (ny) | SendEmail |
| returnLoanedTools | F | LoanRequest, TeamMember | LoanRequest | SendEmail |
| sendLoanReminder | F | LoanRequest, TeamMember | – | SendEmail |
| updateLoanReturnDate | F | LoanRequest | LoanRequest | SendEmail |
| createLokalvardRequest | F | LokalvardArtikelRequest, TeamMember | LokalvardArtikelRequest | SendEmail |
| createWorkwearRequest | F | WorkwearRequest, TeamMember | WorkwearRequest | SendEmail |
| notifyCheckoutComplete | F | LokalvardArtikelRequest | – | SendEmail |
| createUttagFromCheckout | **oklart** (anropas inte via invoke) | LokalvardsArtikel | Uttag, LokalvardCheckout | – |
| createMaterialUttag | F | MaterialLager | MaterialLager, MaterialUttag | – |
| getLokalvardData | F | Kund, LokalvardsArtikel, TeamMember, WorkwearRequest | WorkwearRequest | – |
| getCategoryCounts | F | Tool, HandTool, LokalvardsArtikel, MaterialLager | – | – |
| syncCategories | F | alla lagerentiteter, Category | Category | – |
| updateCategoryName / updateSubcategoryName / deleteCategory | F | Category | Category | – |
| processToolImport | F | – | Tool | – |
| processLokalvardInkopImport | F | LokalvardsArtikel, LokalvardInköp | båda | – |
| processUttagImport | F | – | Uttag | – |
| findToolImage | E (Tool create/update) + F | Tool | Tool.image_url | GenerateImage |
| batchSearchToolImages | F | Tool | – (anropar findToolImage, **oklart** exakt hur) | – |
| logToolChange | E (Tool create/update) | Tool, User | ToolLog | – |
| deduplicateArticles | E (LokalvardsArtikel create) | LokalvardsArtikel | LokalvardsArtikel, LokalvardInköp | – |
| syncTeamMemberRoleToUser | E (TeamMember create/update) | User | User.role | – |
| syncUsersToTeam | S (var 5:e min) | User, TeamMember | TeamMember | – |
| permanentDeleteTrash | S (cron `0 3 * * *`) | Tool, HandTool, ArbetskläderUtrustning, LokalvardsArtikel | delete | – |
| createTeamMemberOnUserCreate | **oklart** (ingen workflow hittad) | TeamMember | TeamMember, User | – |
| inviteUserAsService | F | – | User (inbjudan) | SendEmail |
| setUserRole | F | User | User | – |
| inactivateUser | F | Tool, HandTool, Location, LoanRequest, TeamMember | samma | – |
| deactivateUserAndTransferData | F | samma + User | samma + User | – |
| permanentlyDeleteUser | F | TeamMember | TeamMember (delete) | – |
| unassignToolsFromEntity | F | TeamMember, Tool, HandTool | Tool, HandTool | – |
| exportAllData | F | **oklart** (inga direkta entitetsanrop syns, troligen dynamiska) | – | – |
| backfillMissingInkop, checkInkopDetails, checkOldCategories, cleanupToolData(Batch), createDanmarksgatanSatellites, debugInkopForArticle, debugUttagId, deduplicateInkop, deduplicateToolImports, deduplicateTools, deleteExactDuplicates, deleteUnmatchedUttag, findArticleForBarcode, fixAllInkopArticleIds, fixImportedInkopArtikelIds, fixInkopArticleId, inspectBarcode, inspectDuplicateInkop, inspectUnmatchedInkop, matchUnmatchedInkopByContext, migrateToolCategories, migrateToolUnitIds, migrateUttagIds, removeDuplicateInkop | M | se namn | engångsmigrering/datastädning | – |

> **Källkod:** cirka 60 funktioner och omkring 5 000 rader är inte inklistrade här. Kopiera dem från exporten (`base44/functions/*/entry.ts`). M-funktionerna är engångsskript och behöver troligen inte flyttas.

Exempel, `permanentDeleteTrash`:
```ts
const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
for (const e of ['Tool','HandTool','ArbetskläderUtrustning','LokalvardsArtikel']) {
  const items = await base44.asServiceRole.entities[e].filter({ is_deleted: true }, null, 10000);
  for (const i of items.filter(x => x.deleted_at && x.deleted_at < thirtyDaysAgo))
    await base44.asServiceRole.entities[e].delete(i.id);
}
```
OBS: funktionen kräver en användare med rollen admin eller ägare. Om det schemalagda anropet går igenom med en sådan roll är **oklart**.

---

## 4. AUTOMATIONER OCH INTEGRATIONER

### Workflows (`base44/workflows/`)
| Namn | Trigger | Funktion |
|---|---|---|
| Log Tool Changes | Tool create, update | logToolChange |
| Auto-find Tool Image | Tool create, update | findToolImage |
| Auto-deduplicate articles on creation | LokalvardsArtikel create | deduplicateArticles |
| Synka TeamMember-roll till User | TeamMember create, update | syncTeamMemberRoleToUser |
| Synka nya användare till Team | intervall 5 min | syncUsersToTeam |
| Permanent radering av papperskorg (30 dagar) | cron `0 3 * * *` (tidszon **oklart**) | permanentDeleteTrash |

### Integrationer
| Integration | Var | Ersättning |
|---|---|---|
| SendEmail (HTML-body) | lånefunktioner, begäranden, inbjudan | Resend/Postmark från Edge Function |
| GenerateImage | findToolImage | OpenAI Images, eller Replicate |
| UploadFile (publik), 13 ställen | bilder och importfiler | Supabase Storage, publik bucket |
| ExtractDataFromUploadedFile, 7 ställen | importsidorna (CSV/XLSX) | parsa i klienten (SheetJS/PapaParse) eller med LLM |
| InvokeLLM, SendSMS | bara exporterade i `src/api/integrations.js`, används inte | – |
| QR/streckkod | externa bild-URL:er i `src/lib/labelTypes.js` | samma eller ett lokalt bibliotek |

### AI-prompt (ordagrant, findToolImage)
```
Generate a professional, clean product photograph of a ${tool.name}${tool.manufacturer ? ` by ${tool.manufacturer}` : ''}${tool.model_number ? ` model ${tool.model_number}` : ''}. The image should be on a white or neutral background, well-lit, showing the tool clearly and realistically from a front angle. High quality product photography style.
```
Hoppas över om `tool.image_url` redan finns.

---

## 5. BEHÖRIGHETER

- **Inloggning:** Base44:s plattformsinloggning. Exakt vilka metoder som är aktiverade (e-post/lösenord, Google, Microsoft) är **oklart**, eftersom det konfigureras i dashboarden och inte i koden. Appen är privat och kräver inbjudan.
- **Roller:** se avsnitt 1. `RolePermission` är en matris som ägaren redigerar i UI:t. Om den styr något utöver visning är **oklart**, för den faktiska spärren är RLS.

RLS per entitet. C = create, R = read, U = update, D = delete. Rollerna förkortas så här: Ä = ägare, A = admin, M = mekaniker, V = verktygsförvaltare, AL = admin_lokalvård, L = lokalvårdare.

| Entitet | C | R | U | D |
|---|---|---|---|---|
| Tool, HandTool, Location | Ä A M AL (+V för Tool/HandTool) | Ä A M AL V | Ä A M AL V | Ä A M AL |
| LoanRequest | alla roller ovan + skaparen | rollerna + requested_by, assigned_to, approver, destination_manager (e-post) | rollerna + requested_by, approver | Ä + skaparen |
| ITUtrustning, RolePermission | Ä | Ä | Ä | Ä |
| Unit | Ä | alla | Ä | Ä |
| Category | Ä A M | Ä A M V AL | Ä A M | Ä A M |
| TeamMember | Ä A M | egen e-post + Ä A M V AL | Ä A M | Ä A M |
| MaterialLager | Ä A M AL V | Ä A M AL V | Ä A M AL V | Ä A M AL |
| MaterialUttag | Ä A M AL V | Ä A M AL V | Ä A M | Ä A M |
| InventoryReport | Ä A M AL V | Ä A M AL V | Ä A M AL | Ä A M AL |
| InventorySession | Ä A M V AL | Ä A M V AL | Ä A M V AL | Ä A M |
| ToolLog | Ä A M V + skaparen | Ä A M V | Ä A M | Ä A M |
| CheckoutReport | skaparen, Ä A M | samma | samma | samma |
| LokalvardsArtikel | AL A M Ä | L AL A M Ä | AL A M Ä | AL A M Ä |
| LokalvardInköp, Uttag, LokalvardCheckout | AL A M Ä | AL A M Ä | AL A M Ä | AL A M Ä |
| WorkwearRequest | L AL A M Ä | L AL A M Ä | AL Ä | AL Ä |
| ArbetskläderUtrustning, GlobalAppConfig, LokalvardArtikelRequest, Kund, Huvudmaskin, Inventering, InventeringSkanning, CategoryImage, Transfer, ServiceRecord, ServiceTemplate, DepreciationSetting, SpreadsheetCell | **oklart**, läs respektive `base44/entities/*.jsonc` |

Roller som får göra saker i backend (exempel): `notifyCheckoutComplete` tillåter AL, A, M och Ä. `updateLoanReturnDate` tillåter tilldelad person, beställare, A och Ä. `permanentDeleteTrash` tillåter A och Ä. `setUserRole` och `inviteUserAsService` kontrollerar rollen mot en tillåtelselista och anroparens rang.

---

## 6. AFFÄRSREGLER

- **Avskrivning (linjär, per månad):**
  ```js
  monthly = purchase_price * (annual_percentage/100) / 12
  value   = max(purchase_price * minimum_value_percentage/100, purchase_price - monthly * months)
  // Standard: Låg 20 %/år, min 20 % · Medel 30 %/år, min 10 % · Hög 40 %/år, min 10 %
  // purchase_date i formatet MM-DD-YYYY tolkas om
  ```
- **Försäljningspris i Materialbanken:** `forsaljningspris_manuell ?? inkopspris * 1.3` (+30 %).
- **Beställningsförslag för lokalvård:** om trenden är `up` föreslås `round(avgQtyPerPurchase * 1.3)`.
- **Lagertröskel:** `lagertroskelvarde`, standard 10.
- **Ofullständig maskin:** något av fälten `name, category, manufacturer, model_number, location_name, barcode, unit_id` saknas. Formuläret kan inte sparas förrän alla är ifyllda.
- **IT-kod:** `IT-` följt av 6 siffror, nästa = högsta befintliga + 1.
- **"Ny" på etiketter:** skapad för högst 7 dagar sedan.
- **Papperskorg:** permanent radering efter 30 dagar.
- **Enhet:** TeamMembers `unit_id` går före enheten som sparats i webbläsaren. IT-utrustning filtreras inte på enhet.
- **Svepgest bakåt:** 30 px kantzon (mobil).
- **Uttag.manad:** formatet `YYYY-MM`.
- **Statusvärden:** Tool `available|in_use|i_lager|maintenance|missing|retired|sålda`. HandTool `i_lager|i_bruk|saknas|kasserad`. ITUtrustning `i_bruk|i_lager|repareras|saknas|kasserad`. MaterialLager `i_lager|reserverad|såld`. WorkwearRequest `pending|approved|rejected|completed`. InventorySession `pågående|pausad|avslutad`.
- **Hårdkodat:** `APP_URL = 'https://cemi-tool-tracker.base44.app'`, färgen `#8B1E1E`.

---

## 7. MIGRERING

| Base44 | Supabase |
|---|---|
| `base44.auth.me()` | `supabase.auth.getUser()` + tabellen `profiles` (role, unit_id) |
| `base44.auth.logout()` / `redirectToLogin()` | `supabase.auth.signOut()` / egen inloggningssida (Supabase Auth UI) |
| `base44.users.inviteUser` | `supabase.auth.admin.inviteUserByEmail` (Edge Function, service role) |
| `entities.X.list/filter/get` | `supabase.from('x').select().eq()...` |
| `entities.X.create/update/delete` | `.insert()/.update()/.delete()` |
| `bulkCreate/bulkUpdate` | `.insert([...])` / `.upsert([...])` |
| `entities.X.subscribe` | Supabase Realtime `channel().on('postgres_changes')` |
| `asServiceRole.entities` | Edge Function med `SUPABASE_SERVICE_ROLE_KEY` |
| RLS `user_condition: {role}` | policy `using ((select role from profiles where id = auth.uid()) in (...))`, gärna via en `security definer`-funktion `has_role()` |
| RLS `created_by_id = {{user.id}}` | kolumnen `created_by uuid default auth.uid()` + policy `created_by = auth.uid()` |
| RLS `data.email = {{user.email}}` | `email = auth.jwt()->>'email'` |
| `base44.functions.invoke('f', p)` | `supabase.functions.invoke('f', { body: p })` |
| Entity-workflows (Tool, TeamMember, LokalvardsArtikel) | Postgres-triggers (`logToolChange` och rollsynk kan bli ren PL/pgSQL), eller Database Webhooks till en Edge Function (findToolImage, deduplicateArticles) |
| Schemalagda workflows | `pg_cron` (+ `pg_net` för att anropa en Edge Function). Synken var 5:e minut ersätts bättre med en trigger på `auth.users` |
| `Core.SendEmail` | Edge Function + Resend |
| `Core.UploadFile` | `supabase.storage.from('public').upload()` + `getPublicUrl()` |
| `Core.GenerateImage` | Edge Function + bild-API |
| `Core.ExtractDataFromUploadedFile` | SheetJS/PapaParse i klienten |
| `created_date/updated_date/id` | `id uuid default gen_random_uuid()`, `created_at`, `updated_at` (trigger) |
| `GlobalAppConfig` (nyckel/värde) | tabell med `config_key text unique, config_value jsonb` |

Att tänka på:
- Fältnamn med å/ä/ö och entitetsnamn (`LokalvardInköp`, `ArbetskläderUtrustning`) bör byta till ASCII i Postgres.
- Array- och objektfält (`tool_details`, `artiklar`, `checked_list`, `manual_counts`) kan bli `jsonb` eller egna tabeller.
- Referenser är strängar utan främmande nycklar. Lägg till FK vid importen.
- JSON-exporten innehåller `id` som Base44-strängar. Behåll dem som `text`, eller mappa om till uuid och uppdatera alla `*_id`-fält.