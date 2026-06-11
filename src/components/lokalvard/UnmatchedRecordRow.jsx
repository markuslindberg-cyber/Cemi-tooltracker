import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Trash2, Search, Loader2 } from 'lucide-react';

export default function UnmatchedRecordRow({ record, artiklar, onMatch, onDelete, isMatching, isDeleting }) {
  const [artikelSearch, setArtikelSearch] = useState('');
  const [selectedArtikel, setSelectedArtikel] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredArtiklar = (() => {
    const s = artikelSearch.toLowerCase();
    if (!s) return artiklar.slice(0, 20);
    return artiklar.filter(a =>
      a.benamning?.toLowerCase().includes(s) ||
      a.streckkod?.toLowerCase().includes(s) ||
      a.artikelnummer?.toLowerCase().includes(s)
    ).slice(0, 20);
  })();

  return (
    <div className="px-4 py-3 hover:bg-gray-50/50">
      {/* Record info */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded break-all">
              ID: {record.artikel_id}
            </span>
            {record.ordernummer && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                Order: {record.ordernummer}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm">
            <span className="text-gray-700">
              <span className="font-semibold">{record.antal}</span> st
            </span>
            <span className="text-gray-400">×</span>
            <span className="text-gray-700">
              <span className="font-semibold">{record.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2 })}</span> kr
            </span>
            <span className="text-gray-400">=</span>
            <span className="font-semibold text-gray-900">
              {((record.antal || 0) * (record.pris || 0)).toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Datum: {record.datum || '–'}
            {record.created_date && (
              <span className="ml-3">Skapad: {new Date(record.created_date).toLocaleString('sv-SE')}</span>
            )}
          </div>
        </div>

        {/* Quick delete */}
        <Button
          size="sm"
          variant="ghost"
          className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
          disabled={isDeleting}
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Article picker */}
      <div className="mt-2 flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Sök artikel att matcha till..."
              value={artikelSearch}
              onChange={e => {
                setArtikelSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => { if (artikelSearch) setShowDropdown(true); }}
              className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          {showDropdown && artikelSearch && (
            <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm z-10 relative">
              {filteredArtiklar.map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedArtikel(a);
                    setArtikelSearch('');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between gap-2"
                >
                  <span className="font-medium truncate">{a.benamning}</span>
                  <span className="text-xs text-gray-400 font-mono flex-shrink-0">{a.streckkod}</span>
                </button>
              ))}
              {filteredArtiklar.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-400">Inga artiklar hittades</p>
              )}
            </div>
          )}
          {selectedArtikel && (
            <div className="mt-1 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span className="truncate">{selectedArtikel.benamning}</span>
              <span className="text-xs text-green-600 font-mono">{selectedArtikel.streckkod}</span>
              <button
                onClick={() => setSelectedArtikel(null)}
                className="ml-auto text-gray-400 hover:text-gray-600 text-xs flex-shrink-0"
              >✕</button>
            </div>
          )}
        </div>

        <Button
          size="sm"
          disabled={!selectedArtikel || isMatching}
          onClick={() => onMatch(selectedArtikel.id)}
          className="bg-green-600 hover:bg-green-700 flex-shrink-0"
        >
          {isMatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Matcha
        </Button>
      </div>
    </div>
  );
}