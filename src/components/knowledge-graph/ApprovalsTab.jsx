import React from 'react';
import { CheckCircle, XCircle, Clock, ArrowRight, Shield } from 'lucide-react';

const APPROVALS = [
  {
    title: 'Lån av maskiner',
    entity: 'LoanRequest',
    statuses: ['pending', 'approved', 'rejected', 'pending_return', 'returned'],
    steps: [
      { actor: 'Verktygsförvaltare / Admin / Ägare', action: 'Skapar låneförfrågan', page: '/Transfers' },
      { actor: 'Platsansvarig (approver_email)', action: 'Godkänner eller nekar begäran', fn: 'approveLoanRequest', highlight: true },
      { actor: 'Låntagare (assigned_to)', action: 'Markerar retur av maskiner', fn: 'returnLoanedTools' },
      { actor: 'Platsansvarig (approver)', action: 'Bekräftar mottagning av retur', fn: 'confirmReturn', highlight: true },
    ],
    whoCanApprove: ['Platsansvarig för ursprungsplatsen', 'Admin', 'Admin Lokalvård', 'Ägare'],
    notes: 'Stöder delgodkännande (enstaka verktyg kan nekas). Returndatum kan justeras vid godkännande. Förlängning kan begäras via extendLoanRequest.',
  },
  {
    title: 'Arbetskläder-begäran',
    entity: 'WorkwearRequest',
    statuses: ['pending', 'approved', 'rejected', 'completed'],
    steps: [
      { actor: 'Lokalvårdare / Admin Lokalvård', action: 'Skapar begäran för arbetskläder', page: '/ArbetskläderRequestWorkwear' },
      { actor: 'Admin Lokalvård / Ägare', action: 'Granskar och godkänner begäran', page: '/Arbetsklader/Forfragan', highlight: true },
      { actor: 'Admin Lokalvård', action: 'Skannar streckkod + lämnar ut', page: '/Arbetsklader/Forfragan' },
      { actor: 'System', action: 'Skapar LokalvardCheckout + minskar lager', fn: '(direkt i frontend)' },
    ],
    whoCanApprove: ['Admin Lokalvård', 'Ägare'],
    notes: 'Streckkodscanning krävs vid utlämning. Saknade artiklar kan ersättas med annan storlek/artikel. Email skickas automatiskt till beställaren vid slutförd utlämning.',
  },
  {
    title: 'Lokalvårdsartiklar-begäran',
    entity: 'LokalvardArtikelRequest',
    statuses: ['pending', 'approved', 'rejected', 'completed'],
    steps: [
      { actor: 'Lokalvårdare / Admin Lokalvård', action: 'Skapar begäran för artiklar', page: '/LokalvardRequestArtikel' },
      { actor: 'Admin Lokalvård / Ägare', action: 'Godkänner begäran', page: '/Lokalvard/BegaranAttGodkanna', highlight: true },
      { actor: 'Admin Lokalvård', action: 'Plockar ut artiklarna', page: '/Lokalvard/NyttUttag' },
      { actor: 'System', action: 'Skapar Uttag-post med priser', fn: 'createUttagFromCheckout' },
      { actor: 'System', action: 'Skickar email till beställaren', fn: 'notifyCheckoutComplete' },
    ],
    whoCanApprove: ['Admin Lokalvård', 'Ägare'],
    notes: 'Uttag kopplas till kund och månad för kostnadsrapportering. Artiklar med lågt lagersaldo flaggas automatiskt.',
  },
];

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  pending_return: 'bg-purple-100 text-purple-700',
  returned: 'bg-emerald-100 text-emerald-700',
};

export default function ApprovalsTab() {
  return (
    <div className="space-y-8">
      {APPROVALS.map((flow) => (
        <div key={flow.title} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{flow.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Entitet: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{flow.entity}</code></p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {flow.statuses.map(s => (
                  <span key={s} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[s] || 'bg-gray-100 text-gray-600'}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="px-5 py-4 space-y-3">
            {flow.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    step.highlight ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {step.highlight ? (
                      <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500">{i + 1}</span>
                    )}
                  </div>
                  {i < flow.steps.length - 1 && (
                    <div className="w-0.5 h-6 bg-gray-100 dark:bg-gray-800 mt-1" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className={`font-semibold ${step.highlight ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                      {step.actor}
                    </span>
                    {' → '}{step.action}
                  </p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {step.page && (
                      <span className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">
                        {step.page}
                      </span>
                    )}
                    {step.fn && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono">
                        {step.fn}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Who can approve + Notes */}
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Vem kan godkänna: </span>
                <span className="text-xs text-gray-700 dark:text-gray-300">{flow.whoCanApprove.join(', ')}</span>
              </div>
            </div>
            {flow.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-5">{flow.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}