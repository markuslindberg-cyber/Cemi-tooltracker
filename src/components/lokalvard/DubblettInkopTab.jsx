import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * Visar potentiella dubbletter: inköp på samma dag, antal & pris
 * men med olika artikel_id (dvs olika artikelnamn/streckkod).
 */
export default function DubblettInkopTab({ resolvedInköp }) {
  // Gruppera på datum + antal + pris (ignorerar artikel_id)
  const groups = React.useMemo(() => {
    const map = {};
    resolvedInköp.forEach(i => {
      const key = `${i.datum}|${i.antal}|${i.pris}`;
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    // Behåll bara grupper med >1 post OCH >1 unika artikel_id
    return Object.values(map)
      .filter(group => {
        if (group.length < 2) return false;
        const uniqueIds = new Set(group.map(g => g.artikel_id));
        return uniqueIds.size > 1;
      })
      .sort((a, b) => (b[0].datum || '').localeCompare(a[0].datum || ''));
  }, [resolvedInköp]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">Inga misstänkta dubbletter hittades</p>
        <p className="text-sm mt-1">Alla inköp ser unika ut.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 font-medium">
            {groups.length} grupp{groups.length !== 1 ? 'er' : ''} med möjliga dubbletter
          </span>
        </div>
        <p className="text-xs text-amber-700 ml-7">
          Dessa inköp har grupperats ihop eftersom de har <strong>samma datum</strong>, <strong>samma antal</strong> och <strong>samma pris</strong> — men är registrerade mot <strong>olika artiklar</strong> (olika artikel-ID/namn/streckkod). Det kan bero på att samma inköp importerats eller registrerats flera gånger mot olika varianter av samma produkt.
        </p>
      </div>

      {groups.map((group, idx) => {
        const first = group[0];
        const totalKostnad = (first.antal || 0) * (first.pris || 0);
        return (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-800">{first.datum}</span>
                <span className="text-gray-500">Antal: <span className="font-medium text-gray-700">{first.antal}</span></span>
                <span className="text-gray-500">Pris: <span className="font-medium text-gray-700">{first.pris} kr</span></span>
                {first.ordernummer && <span className="text-gray-500">Order: <span className="font-medium text-gray-700">{first.ordernummer}</span></span>}
              </div>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {group.length} poster
              </span>
            </div>
            <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100 text-xs text-amber-700">
              <span className="font-medium">Gemensamt:</span> datum {first.datum}, antal {first.antal}, pris {first.pris} kr
              {' · '}<span className="font-medium">Skiljer sig:</span> {group.length} olika artiklar ({[...new Set(group.map(g => g.benamning))].join(' / ')})
            </div>
            <div className="divide-y divide-gray-100">
              {group.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/Lokalvard/Artikel/${item.artikelLink}`}
                      className="font-medium text-blue-600 hover:underline truncate block"
                    >
                      {item.benamning}
                    </Link>
                    <span className="text-xs text-gray-400">{item.streckkod || item.artikel_id}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4 flex items-center gap-4">
                    <span className="text-gray-500">{item.antal} st</span>
                    <div>
                      <span className="font-medium text-gray-700">{((item.antal || 0) * (item.pris || 0)).toLocaleString('sv-SE')} kr</span>
                      <div className="text-xs text-gray-400">{item.source === 'manuella' ? 'Manuell' : 'Import'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}