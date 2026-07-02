import React, { useState } from 'react';
import { 
  BookOpen, MapPin, Globe, Camera, Search, Pause, Play, 
  Download, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  ClipboardList, Package, Plus, ArrowLeft, PencilLine
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  {
    id: 'overview',
    title: 'Översikt',
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <p>Inventeringsmodulen låter dig kontrollera att alla maskiner, handredskap, arbetskläder, lokalvårdsartiklar och material finns på rätt plats och i rätt antal.</p>
        <p>Modulen består av tre huvuddelar:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Inventering</strong> — Starta och genomför inventeringar genom att skanna streckkoder eller mata in artiklar manuellt.</li>
          <li><strong>Inventeringsrapporter</strong> — Se historik över genomförda inventeringar med detaljerad statistik.</li>
        </ul>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-4">
          <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Tips:</strong> Du hittar inventeringen under menyn <em>Inventeringskontroll → Inventering</em> och rapporterna under <em>Inventeringskontroll → Inventeringsrapporter</em>.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'start',
    title: 'Starta en inventering',
    icon: ClipboardList,
    content: (
      <div className="space-y-4">
        <p>När du öppnar inventeringssidan möts du av startskärmen. Här väljer du hur inventeringen ska genomföras.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#8B1E1E]" /> Platsbaserad inventering
        </h4>
        <p>Välj denna om du vill inventera alla artiklar på en specifik plats (t.ex. ett lager, fordon eller arbetsplats). Systemet filtrerar automatiskt fram artiklarna som tillhör den valda platsen.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Klicka på <strong>"Platsbaserad inventering"</strong></li>
          <li>Välj en plats från listan</li>
          <li>Välj vilka typer av artiklar som ska inventeras (Maskiner, Handredskap, Arbetskläder, Lokalvård, Material — eller "Alla")</li>
          <li>Klicka <strong>"Starta inventering"</strong></li>
        </ol>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#8B1E1E]" /> Öppen inventering
        </h4>
        <p>Välj denna om du vill skanna artiklar oberoende av vilken plats de tillhör. Perfekt för stickprovskontroller eller när du rör dig mellan flera platser.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Klicka på <strong>"Öppen inventering"</strong></li>
          <li>Välj vilka typer av artiklar som ska inventeras</li>
          <li>Klicka <strong>"Starta inventering"</strong></li>
        </ol>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-4">
          <p className="text-sm text-amber-800 dark:text-amber-300"><strong>Skillnad:</strong> Vid platsbaserad inventering ser du en framstegsindikator och listan över ej kontrollerade artiklar. Vid öppen inventering visas bara antal skannade artiklar, eftersom det inte finns en begränsad lista att jämföra mot.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'scanning',
    title: 'Skanna och registrera artiklar',
    icon: Camera,
    content: (
      <div className="space-y-4">
        <p>Under en pågående inventering kan du registrera artiklar på tre sätt:</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">1. Extern streckkodsläsare (rekommenderat)</h4>
        <p>Den gröna rutan "Extern skanner / tangentbord" är alltid synlig och i fokus. Skanna bara med din handskanner — streckkoden läses automatiskt och artikeln registreras direkt.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Skanna en artikel → grön bekräftelse visas med artikelns namn</li>
          <li>Om artikeln inte hittas → röd varning visas</li>
          <li>Du kan också skriva in streckkoden manuellt i fältet och trycka Enter</li>
        </ul>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-6">2. Kameraskanner</h4>
        <p>Klicka <strong>"Kameraskanner"</strong> för att använda enhetens kamera. Rikta kameran mot streckkoden — artikeln registreras automatiskt när koden läses av.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-6">3. Manuell sökning</h4>
        <p>Klicka <strong>"Manuell sökning"</strong> för att öppna en sökdialog. Här kan du:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Söka på streckkod, artikelnummer eller namn</li>
          <li>Ange antal i lager (för lokalvårdsartiklar, arbetskläder och material)</li>
          <li>Dialogen stannar öppen så du kan fortsätta med nästa artikel utan att stänga</li>
        </ul>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-4">
          <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Tips:</strong> Maskiner och handredskap registreras som "kontrollerade" direkt vid skanning. Lokalvårdsartiklar, arbetskläder och material kan även få ett manuellt antal inmatat via "Manuell sökning".</p>
        </div>
      </div>
    ),
  },
  {
    id: 'progress',
    title: 'Framsteg och skannade produkter',
    icon: CheckCircle2,
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Framstegsindikator</h4>
        <p>Vid platsbaserad inventering visas en framstegsbar som visar hur många av artiklarna som kontrollerats (t.ex. "24 / 50"). När alla artiklar är kontrollerade visas ett grönt meddelande "Alla föremål kontrollerade!".</p>
        
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Skannade produkter</h4>
        <p>Under skannern visas en lista med alla produkter som redan skannats, med tidsstämpel och typ. För lokalvårdsartiklar visas även jämförelse mellan inventerat antal och lagersaldo.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Ej kontrollerade</h4>
        <p>Vid platsbaserad inventering visas listan "Ej kontrollerade" längst ner — alltså de artiklar som ännu inte skannats. Denna lista uppdateras i realtid allteftersom du skannar.</p>
      </div>
    ),
  },
  {
    id: 'pause',
    title: 'Pausa och återuppta',
    icon: Pause,
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Pausa en inventering</h4>
        <p>Klicka <strong>"Pausa"</strong> för att spara allt framsteg och gå tillbaka till startskärmen. Alla skannade artiklar och manuella antal sparas.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Automatisk paus</h4>
        <p>Om du navigerar bort från sidan eller stänger webbläsaren sparas inventeringen automatiskt som pausad. Du förlorar inget framsteg.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Fortsätt en pausad inventering</h4>
        <p>När du öppnar inventeringssidan igen:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Om du bara har <strong>en</strong> pausad inventering → den återupptas automatiskt</li>
          <li>Om du har <strong>flera</strong> pausade inventeringar → de visas i en gul ruta på startskärmen med en "Fortsätt"-knapp vid varje</li>
        </ul>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mt-4">
          <p className="text-sm text-green-800 dark:text-green-300"><strong>Bra att veta:</strong> Du kan pausa och fortsätta hur många gånger som helst. Alla skannade artiklar bevaras mellan sessionerna.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'finish',
    title: 'Avsluta och spara rapport',
    icon: Download,
    content: (
      <div className="space-y-4">
        <p>Klicka <strong>"Avsluta & spara"</strong> eller piltangeln tillbaka (←) för att avsluta inventeringen.</p>
        
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Sammanfattning</h4>
        <p>Efter avslutad inventering visas en sammanfattning med:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Totalt</strong> antal artiklar i scopet</li>
          <li><strong>Kontrollerade</strong> — antal skannade/registrerade</li>
          <li><strong>Ej kontrollerade</strong> — antal som inte skannats</li>
        </ul>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Exportera CSV</h4>
        <p>Klicka <strong>"Exportera CSV"</strong> för att ladda ner en komplett rapport som CSV-fil. Filen innehåller alla artiklar med status (kontrollerad/ej kontrollerad), typ, plats och eventuellt skannat antal.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Inventeringsrapport</h4>
        <p>En rapport sparas automatiskt i systemet och kan hittas under <em>Inventeringskontroll → Inventeringsrapporter</em>.</p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Lagerkorrigering (Admin Lokalvård / Ägare)</h4>
        <p>Om inventeringen innehöll lokalvårdsartiklar och du har rollen <strong>Admin Lokalvård</strong> eller <strong>Ägare</strong>, visas en sektion "Lagerkorrigering" där du kan jämföra inventerat antal mot systemets lagersaldo och göra korrigeringar.</p>
      </div>
    ),
  },
  {
    id: 'reports',
    title: 'Inventeringsrapporter',
    icon: ClipboardList,
    content: (
      <div className="space-y-4">
        <p>Under <em>Inventeringskontroll → Inventeringsrapporter</em> hittar du alla sparade rapporter.</p>
        <p>Varje rapport visar:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Datum och tid</li>
          <li>Vem som genomförde inventeringen</li>
          <li>Plats och typ av inventering</li>
          <li>Antal kontrollerade vs ej kontrollerade artiklar</li>
          <li>Detaljerad lista över kontrollerade och ej kontrollerade artiklar</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'tips',
    title: 'Tips och bästa praxis',
    icon: AlertTriangle,
    content: (
      <div className="space-y-4">
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-[#8B1E1E] font-bold text-lg leading-none mt-0.5">1.</span>
            <span><strong>Använd extern streckkodsläsare</strong> för snabbast genomförande. Den fungerar som ett tangentbord och registrerar artiklar direkt.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#8B1E1E] font-bold text-lg leading-none mt-0.5">2.</span>
            <span><strong>Inventera platsvis</strong> för att se framsteg och identifiera saknade artiklar. Öppen inventering är bra för stickprov.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#8B1E1E] font-bold text-lg leading-none mt-0.5">3.</span>
            <span><strong>Pausa om du blir avbruten</strong> — allt sparas automatiskt. Bara stäng sidan eller klicka "Pausa".</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#8B1E1E] font-bold text-lg leading-none mt-0.5">4.</span>
            <span><strong>Använd manuell sökning</strong> för lokalvårdsartiklar och material där du behöver ange antal istället för att bara skanna en streckkod.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#8B1E1E] font-bold text-lg leading-none mt-0.5">5.</span>
            <span><strong>Kontrollera rapporterna</strong> regelbundet för att identifiera saknade artiklar och mönster.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#8B1E1E] font-bold text-lg leading-none mt-0.5">6.</span>
            <span><strong>Se till att artiklarna har streckkoder</strong> registrerade i systemet — artiklar utan streckkod kan bara hittas via manuell sökning.</span>
          </li>
        </ul>
      </div>
    ),
  },
];

function ManualSection({ section, isOpen, onToggle }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          isOpen ? "bg-[#8B1E1E]/10" : "bg-gray-100 dark:bg-gray-800"
        )}>
          <section.icon className={cn("w-4.5 h-4.5", isOpen ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400")} />
        </div>
        <span className={cn("flex-1 font-semibold text-sm", isOpen ? "text-[#8B1E1E]" : "text-gray-900 dark:text-gray-100")}>
          {section.title}
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function InventeringsManual() {
  const [openSections, setOpenSections] = useState({ overview: true });

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAll = () => {
    const all = {};
    sections.forEach(s => { all[s.id] = true; });
    setOpenSections(all);
  };

  const closeAll = () => setOpenSections({});

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8B1E1E]/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#8B1E1E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manual — Inventering</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Steg-för-steg-guide för inventeringsmodulen</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openAll} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">Visa alla</button>
          <button onClick={closeAll} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">Dölj alla</button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <ManualSection
            key={section.id}
            section={section}
            isOpen={!!openSections[section.id]}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>
    </div>
  );
}