import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Trash2, Search, Loader2, Pencil } from 'lucide-react';

export default function UnmatchedRecordRow({ record, artiklar, onMatch, onDelete, isMatching, isDeleting }) {
  const [artikelSearch, setArtikelSearch] = useState('');
  const [selectedArtikel, setSelectedArtikel] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    datum: record.datum || '',
    antal: record.antal ?? '',
    pris: record.pris ?? '',
    ordernummer: record.ordernummer || '',
  });

  useEffect(() => {
    setEditData({
      datum: record.datum || '',
      antal: record.antal ?? '',
      pris: record.pris ?? '',
      ordernummer: record.ordernummer || '',
    });
  }, [record]);

  const filteredArtiklar = (() => {
    const s = artikelSearch.toLowerCase();
    if (!s) return artiklar.slice(0, 20);
    return artiklar.filter(a =>
      a.benamning?.toLowerCase().includes(s) ||
      a.streckkod?.toLowerCase().includes(s) ||
      a.artikelnummer?.toLowerCase().includes(s)
    ).slice(0, 20);
  })();

  const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const datumInvalid = editData.datum && !isValidDate(editData.datum);

  const handleMatch = () => {
    const updates = {};
    if (editData.datum !== (record.datum || '')) updates.datum = editData.datum || null;
    if (parseFloat(editData.antal) !== record.antal) updates.antal = parseFloat(editData.antal) || 0;
    if (parseFloat(editData.pris) !== record.pris) updates.pris = parseFloat(editData.pris) || 0;
    if (editData.ordernummer !== (record.ordernummer || '')) updates.ordernummer = editData.ordernummer || null;
    onMatch(selectedArtikel.id, updates);
  };

  return (
    <div className="px-4 py-3 hover:bg-gray-50/50">
      {/* Record info / edit mode */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded break-all">
              ID: {record.artikel_id}
            </span>
            {!editing && record.ordernummer && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                Order: {record.ordernummer}
              </span>
            )}
          </div>

          {editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Datum</label>
                <Input
                  type="date"
                  value={editData.datum}
                  onChange={e => setEditData(d => ({ ...d, datum: e.target.value }))}
                  className={`h-8 text-sm ${datumInvalid ? 'border-red-400' : ''}`}
                />
                {datumInvalid && <p className="text-xs text-red-500 mt-0.5">Ogiltigt format</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Antal</label>
                <Input
                  type="number"
                  value={editData.antal}
                  onChange={e => setEditData(d => ({ ...d, antal: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Pris/st (kr)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.pris}
                  onChange={e => setEditData(d => ({ ...d, pris: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Ordernummer</label>
                <Input
                  type="text"
                  value={editData.ordernummer}
                  onChange={e => setEditData(d => ({ ...d, ordernummer: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="–"
                />
              </div>
            </div>
          ) : (
            <>
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
                Datum: <span className={datumInvalid || (!isValidDate(record.datum || '') && record.datum) ? 'text-amber-600 font-medium' : ''}>
                  {record.datum || '–'}
                </span>
                {record.created_date && (
                  <span className="ml-3">Skapad: {new Date(record.created_date).toLocaleString('sv-SE')}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Edit / Delete buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
            disabled={isDeleting}
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
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
          onClick={handleMatch}
          className="bg-green-600 hover:bg-green-700 flex-shrink-0"
        >
          {isMatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Matcha
        </Button>
      </div>
    </div>
  );
}