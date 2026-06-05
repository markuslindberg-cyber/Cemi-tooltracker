import React from 'react';
import { CATEGORIES } from './graphData';

const WORKFLOWS = [
  {
    id: 'loan',
    title: '🔧 Lånflöde (Maskiner)',
    steps: [
      { label: 'Begäran skapas', cat: 'page', detail: '/Transfers' },
      { label: 'createLoanRequest', cat: 'function', detail: 'Skapar LoanRequest + email' },
      { label: 'Email → Godkännare', cat: 'email', detail: '+ destinationschef + beställare' },
      { label: 'Godkännare granskar', cat: 'role', detail: 'Admin/Ägare/Platsansvarig' },
      { label: 'approveLoanRequest', cat: 'function', detail: 'Godkänn/Neka/Delgodkänn' },
      { label: 'Status: approved', cat: 'entity', detail: 'LoanRequest uppdateras' },
      { label: 'returnLoanedTools', cat: 'function', detail: 'Låntagare markerar retur' },
      { label: 'Status: pending_return', cat: 'entity', detail: 'Email → bekräfta mottagning' },
      { label: 'confirmReturn', cat: 'function', detail: 'Godkännare bekräftar' },
      { label: 'Status: returned ✅', cat: 'entity', detail: '+ ToolLog skapas' },
    ],
  },
  {
    id: 'workwear',
    title: '👔 Arbetskläder-flöde',
    steps: [
      { label: 'Begäran skapas', cat: 'page', detail: '/ArbetskläderRequestWorkwear' },
      { label: 'createWorkwearRequest', cat: 'function', detail: 'Skapar WorkwearRequest + email' },
      { label: 'Email → Admin Lokalvård', cat: 'email', detail: '+ ägare' },
      { label: 'Admin granskar', cat: 'role', detail: 'Admin Lokalvård/Ägare' },
      { label: 'Scanning & utlämning', cat: 'page', detail: '/Arbetsklader/Forfragan' },
      { label: 'LokalvardCheckout', cat: 'entity', detail: 'Artiklar skannade + kvitterade' },
      { label: 'Lager uppdateras', cat: 'entity', detail: 'ArbetskläderUtrustning -qty' },
      { label: 'Status: completed ✅', cat: 'entity', detail: 'WorkwearRequest stängs' },
    ],
  },
  {
    id: 'lokalvard',
    title: '🧹 Lokalvårdsartiklar-flöde',
    steps: [
      { label: 'Begäran skapas', cat: 'page', detail: '/LokalvardRequestArtikel' },
      { label: 'createLokalvardRequest', cat: 'function', detail: 'Skapar begäran + email' },
      { label: 'Email → Admin Lokalvård', cat: 'email', detail: '+ ägare' },
      { label: 'Admin godkänner', cat: 'role', detail: '/Lokalvard/BegaranAttGodkanna' },
      { label: 'Uttag plockas', cat: 'page', detail: '/Lokalvard/NyttUttag' },
      { label: 'createUttagFromCheckout', cat: 'function', detail: 'Skapar Uttag med priser' },
      { label: 'notifyCheckoutComplete', cat: 'function', detail: 'Email → beställaren' },
      { label: 'Kostnad per kund 📊', cat: 'entity', detail: 'Uttag → KostnadPerKund-rapport' },
    ],
  },
];

export default function WorkflowDiagram() {
  return (
    <div className="space-y-8">
      {WORKFLOWS.map(wf => (
        <div key={wf.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{wf.title}</h3>
          <div className="space-y-0">
            {wf.steps.map((step, i) => {
              const cat = CATEGORIES[step.cat];
              return (
                <div key={i} className="flex items-start gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mt-1.5 ring-2 ring-white dark:ring-gray-900"
                      style={{ backgroundColor: cat.color }}
                    />
                    {i < wf.steps.length - 1 && (
                      <div className="w-0.5 h-10 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.label}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cat.bg, color: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}