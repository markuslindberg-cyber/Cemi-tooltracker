import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function InkopshistorikTable({ rows, sortBy, sortOrder, onSort }) {
  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUp className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-600 inline ml-1" />;
  };

  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">Inga inköp att visa</div>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-xs" onClick={() => onSort('datum')}>
                Datum <SortIcon col="datum" />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => onSort('benamning')}>
                Artikel <SortIcon col="benamning" />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">Streckkod</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => onSort('antal')}>
                Antal <SortIcon col="antal" />
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => onSort('pris')}>
                Pris/st <SortIcon col="pris" />
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 text-xs" onClick={() => onSort('total_kostnad')}>
                Totalt <SortIcon col="total_kostnad" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900 whitespace-nowrap text-xs">{row.datum}</td>
                <td className="px-3 py-2 font-medium text-xs">
                  <Link to={`/Lokalvard/Artikel/${encodeURIComponent(row.artikelLink)}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                    {row.benamning}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs font-mono">{row.streckkod}</td>
                <td className="px-3 py-2 text-right text-gray-900 text-xs">{row.antal}</td>
                <td className="px-3 py-2 text-right text-gray-900 text-xs whitespace-nowrap">
                  {row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs whitespace-nowrap">
                  {row.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {rows.map(row => (
          <div key={row.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <Link to={`/Lokalvard/Artikel/${encodeURIComponent(row.artikelLink)}`} className="font-semibold text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block">
                  {row.benamning}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">{row.streckkod}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 whitespace-nowrap ml-3">
                {row.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </p>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <span>{row.datum}</span>
              <span>{row.antal} st × {row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}