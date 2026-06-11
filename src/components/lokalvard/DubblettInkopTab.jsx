import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Trash2, Loader2, CheckCheck, Search, X, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function DubblettGroup({ group, allArtiklar, onResolved, onDismiss }) {
  const [selected, setSelected] = useState(null); // id of item to keep
  const [processing, setProcessing] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualSelected, setManualSelected] = useState(null);
  // Track which items to replace with manual article (by id) – use object for React compatibility
  const [replaceMap, setReplaceMap] = useState(() => {
    const m = {};
    group.forEach(i => { m[i.id] = true; });
    return m;
  });

  const first = group[0];

  const replaceIds = useMemo(() => Object.keys(replaceMap).filter(id => replaceMap[id]), [replaceMap]);

  const toggleReplaceId = (id) => {
    setReplaceMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const manualResults = useMemo(() => {
    if (!manualSearch || manualSearch.length < 2) return [];
    const q = manualSearch.toLowerCase();
    return allArtiklar
      .filter(a => !a.is_deleted && (
        a.benamning?.toLowerCase().includes(q) ||
        a.streckkod?.includes(manualSearch) ||
        a.artikelnummer?.toLowerCase().includes(q)
      ))
      .slice(0, 10);
  }, [manualSearch, allArtiklar]);

  const handleKeepSelected = async () => {
    if (!selected) return;
    setProcessing(true);
    const toDelete = group.filter(i => i.id !== selected);
    for (const item of toDelete) {
      await base44.entities.LokalvardInköp.delete(item.id);
    }
    setProcessing(false);
    setDismissReason(`Behöll vald post – ${group.length - 1} dubbletter borttagna.`);
    setResolved(true);
    onResolved();
  };

  const handleReplaceWithManual = async () => {
    if (!manualSelected || replaceIds.length === 0) return;
    setProcessing(true);
    // Create one new inköp for the chosen article
    await base44.entities.LokalvardInköp.create({
      artikel_id: manualSelected.id,
      datum: first.datum,
      antal: first.antal,
      pris: first.pris,
      ordernummer: first.ordernummer || null,
    });
    // Delete only the selected items
    const idsToDelete = new Set(replaceIds);
    for (const item of group.filter(i => idsToDelete.has(i.id))) {
      await base44.entities.LokalvardInköp.delete(item.id);
    }
    setProcessing(false);
    const count = replaceIds.length;
    setDismissReason(`Ersatt ${count} post${count > 1 ? 'er' : ''} med "${manualSelected.benamning}".`);
    setResolved(true);
    onResolved();
  };

  const handleDeleteSingle = async (id) => {
    setProcessing(true);
    await base44.entities.LokalvardInköp.delete(id);
    setProcessing(false);
    setDismissReason('Post borttagen.');
    setResolved(true);
    onResolved();
  };

  const [dismissReason, setDismissReason] = useState('');

  const handleKeepAll = async () => {
    setProcessing(true);
    if (onDismiss) await onDismiss();
    setProcessing(false);
    setDismissReason('Alla poster behålls som separata artiklar.');
    setResolved(true);
    onResolved();
  };

  if (resolved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
        <Check className="w-4 h-4" />
        <span>{dismissReason || 'Grupp hanterad.'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
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

      {/* Info */}
      <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100 text-xs text-amber-700">
        <span className="font-medium">Gemensamt:</span> datum {first.datum}, antal {first.antal}, pris {first.pris} kr
        {' · '}<span className="font-medium">Skiljer sig:</span> {group.length} olika artiklar ({[...new Set(group.map(g => g.benamning))].join(' / ')})
      </div>

      {/* Instruction */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
        Välj den post som är korrekt och ska behållas, eller ta bort enskilda poster med papperskorgen.
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {group.map(item => {
          const isSelected = selected === item.id;
          return (
            <div
              key={item.id}
              onClick={() => !processing && setSelected(item.id)}
              className={`px-4 py-3 flex items-center justify-between text-sm cursor-pointer transition-colors ${
                isSelected ? 'bg-green-50 ring-1 ring-inset ring-green-300' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Radio indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-green-600 bg-green-600' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/Lokalvard/Artikel/${item.artikelLink}`}
                    className="font-medium text-blue-600 hover:underline truncate block"
                    onClick={e => e.stopPropagation()}
                  >
                    {item.benamning}
                  </Link>
                  <span className="text-xs text-gray-400">{item.streckkod || item.artikel_id}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-gray-500">{item.antal} st</span>
                <div className="text-right">
                  <span className="font-medium text-gray-700">{((item.antal || 0) * (item.pris || 0)).toLocaleString('sv-SE')} kr</span>
                  <div className="text-xs text-gray-400">{item.source === 'manuella' ? 'Manuell' : 'Import'}</div>
                </div>
                {/* Delete single */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                  disabled={processing}
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm(`Ta bort inköpsposten för "${item.benamning}"?`)) {
                      handleDeleteSingle(item.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual article picker */}
      {showManualPicker && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-800">Välj vilka poster att ersätta:</p>
            <button onClick={() => { setShowManualPicker(false); setManualSelected(null); setManualSearch(''); const m = {}; group.forEach(i => { m[i.id] = true; }); setReplaceMap(m); }} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Checkboxes for which items to replace */}
          <div className="bg-white border border-blue-200 rounded-lg divide-y divide-gray-100">
            {group.map(item => (
              <label key={item.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50/50 text-sm">
                <Checkbox
                  checked={!!replaceMap[item.id]}
                  onCheckedChange={() => toggleReplaceId(item.id)}
                />
                <span className="font-medium text-gray-800 truncate flex-1">{item.benamning}</span>
                <span className="text-xs text-gray-400 shrink-0">{item.streckkod || item.artikel_id}</span>
              </label>
            ))}
          </div>

          {replaceIds.length === 0 && (
            <p className="text-xs text-red-600">Välj minst en post att ersätta.</p>
          )}

          {/* Search for replacement article */}
          <div>
            <p className="text-xs font-medium text-blue-800 mb-1">Sök efter rätt artikel:</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Sök namn, streckkod eller artikelnummer..."
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          {manualResults.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {manualResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => setManualSelected(a)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${
                    manualSelected?.id === a.id ? 'bg-green-50 ring-1 ring-inset ring-green-300' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-800 truncate block">{a.benamning}</span>
                    <span className="text-xs text-gray-400">{a.streckkod || a.artikelnummer || ''}</span>
                  </div>
                  {manualSelected?.id === a.id && <Check className="w-4 h-4 text-green-600 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          )}
          {manualSearch.length >= 2 && manualResults.length === 0 && (
            <p className="text-xs text-gray-500 py-1">Inga artiklar hittades.</p>
          )}
          {manualSelected && replaceIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-700">
                Ersätt {replaceIds.length} av {group.length} post{replaceIds.length > 1 ? 'er' : ''} med <strong>{manualSelected.benamning}</strong>
              </p>
              <Button
                size="sm"
                className="bg-[#8B1E1E] hover:bg-[#6B1515] shrink-0"
                disabled={processing}
                onClick={handleReplaceWithManual}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Replace className="w-4 h-4 mr-1" />}
                Ersätt
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        {selected ? (
          <>
            <p className="text-xs text-gray-500">
              Behåll vald post och ta bort {group.length - 1} övriga?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(null)} disabled={processing}>
                Avbryt
              </Button>
              <Button
                size="sm"
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
                disabled={processing}
                onClick={handleKeepSelected}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Behåll & ta bort resten
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Välj en post, sök manuellt, eller behåll alla.
            </p>
            <div className="flex gap-2 flex-wrap">
              {!showManualPicker && (
                <Button size="sm" variant="outline" onClick={() => setShowManualPicker(true)} disabled={processing}>
                  <Search className="w-4 h-4 mr-1" />
                  Ingen av dessa – välj manuellt
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleKeepAll} disabled={processing}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Behåll alla
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Generate a stable key for a duplicate group
function groupKey(group) {
  const ids = group.map(i => i.id).sort().join(',');
  return `${group[0].datum}|${group[0].antal}|${group[0].pris}|${ids}`;
}

export default function DubblettInkopTab({ resolvedInköp, onRefresh }) {
  const queryClient = useQueryClient();

  const { data: allArtiklar = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).catch(() => []),
    staleTime: 60000,
  });

  // Load dismissed group keys from GlobalAppConfig
  const { data: dismissedConfig } = useQuery({
    queryKey: ['dismissedDuplicates'],
    queryFn: async () => {
      const configs = await base44.entities.GlobalAppConfig.filter({ config_key: 'dismissed_duplicate_groups' });
      return configs[0] || null;
    },
    staleTime: 30000,
  });

  const dismissedKeys = useMemo(() => {
    if (!dismissedConfig?.config_value?.keys) return new Set();
    return new Set(dismissedConfig.config_value.keys);
  }, [dismissedConfig]);

  const saveDismissedKey = async (key) => {
    const newKeys = [...dismissedKeys, key];
    if (dismissedConfig) {
      await base44.entities.GlobalAppConfig.update(dismissedConfig.id, {
        config_value: { keys: newKeys },
      });
    } else {
      await base44.entities.GlobalAppConfig.create({
        config_key: 'dismissed_duplicate_groups',
        config_value: { keys: newKeys },
      });
    }
    queryClient.invalidateQueries({ queryKey: ['dismissedDuplicates'] });
  };

  const groups = useMemo(() => {
    const map = {};
    resolvedInköp.forEach(i => {
      const key = `${i.datum}|${i.antal}|${i.pris}`;
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return Object.values(map)
      .filter(group => {
        if (group.length < 2) return false;
        const uniqueIds = new Set(group.map(g => g.artikel_id));
        if (uniqueIds.size <= 1) return false;
        // Filter out dismissed groups
        return !dismissedKeys.has(groupKey(group));
      })
      .sort((a, b) => (b[0].datum || '').localeCompare(a[0].datum || ''));
  }, [resolvedInköp, dismissedKeys]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">Inga misstänkta dubbletter hittades</p>
        <p className="text-sm mt-1">Alla inköp ser unika ut.</p>
      </div>
    );
  }

  const handleResolved = () => {
    if (onRefresh) onRefresh();
  };

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
          Dessa inköp har grupperats ihop eftersom de har <strong>samma datum</strong>, <strong>samma antal</strong> och <strong>samma pris</strong> — men är registrerade mot <strong>olika artiklar</strong> (olika artikel-ID/namn/streckkod). Välj vilken post som ska behållas i varje grupp.
        </p>
      </div>

      {groups.map((group, idx) => (
        <DubblettGroup key={idx} group={group} allArtiklar={allArtiklar} onResolved={handleResolved} onDismiss={() => saveDismissedKey(groupKey(group))} />
      ))}
    </div>
  );
}