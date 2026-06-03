import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertTriangle, Minus, Save, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ArbetskläderStreckkodhantering() {
  const [selectedArticle, setSelectedArticle] = useState('');
  const [barcodeEdits, setBarcodeEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['arbetskläder-streckkod'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500),
  });

  // Group items by name to get unique article names
  const articleNames = useMemo(() => {
    const names = [...new Set(items.filter(i => !i.is_deleted).map(i => i.name))].sort();
    return names;
  }, [items]);

  // Get items for the selected article, sorted by size
  const articleItems = useMemo(() => {
    if (!selectedArticle) return [];
    return items
      .filter(i => i.name === selectedArticle && !i.is_deleted)
      .sort((a, b) => {
        const aIdx = SIZE_ORDER.indexOf(a.size);
        const bIdx = SIZE_ORDER.indexOf(b.size);
        if (aIdx === -1 && bIdx === -1) return (a.size || '').localeCompare(b.size || '');
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
  }, [items, selectedArticle]);

  // All barcodes in the system (for duplicate detection)
  const allBarcodes = useMemo(() => {
    const map = {};
    items.filter(i => !i.is_deleted && i.barcode).forEach(i => {
      if (!map[i.barcode]) map[i.barcode] = [];
      map[i.barcode].push(i);
    });
    return map;
  }, [items]);

  const getCurrentBarcode = (item) => {
    return barcodeEdits[item.id] !== undefined ? barcodeEdits[item.id] : (item.barcode || '');
  };

  const handleBarcodeChange = (itemId, value) => {
    setBarcodeEdits(prev => ({ ...prev, [itemId]: value }));
  };

  const getDuplicateWarning = (item) => {
    const barcode = getCurrentBarcode(item);
    if (!barcode) return null;
    const existing = allBarcodes[barcode];
    if (existing && existing.some(e => e.id !== item.id)) {
      const other = existing.find(e => e.id !== item.id);
      return `Redan använd av: ${other.name}${other.size ? ` (${other.size})` : ''}`;
    }
    return null;
  };

  const saveBarcode = async (item) => {
    const newBarcode = getCurrentBarcode(item);
    setSavingId(item.id);
    await base44.entities.ArbetskläderUtrustning.update(item.id, { barcode: newBarcode });
    queryClient.invalidateQueries({ queryKey: ['arbetskläder-streckkod'] });
    setBarcodeEdits(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setSavingId(null);
    toast({ title: 'Sparat', description: `Streckkod för ${item.size || 'artikeln'} uppdaterad.` });
  };

  const saveAll = async () => {
    const editedIds = Object.keys(barcodeEdits);
    if (editedIds.length === 0) return;
    setSavingId('all');
    for (const id of editedIds) {
      await base44.entities.ArbetskläderUtrustning.update(id, { barcode: barcodeEdits[id] });
    }
    queryClient.invalidateQueries({ queryKey: ['arbetskläder-streckkod'] });
    setBarcodeEdits({});
    setSavingId(null);
    toast({ title: 'Allt sparat', description: `${editedIds.length} streckkoder uppdaterade.` });
  };

  const hasEdits = Object.keys(barcodeEdits).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Streckkodhantering</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Hantera streckkoder per storlek för arbetskläder</p>
        </div>

        {/* Article selector */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Välj artikel</label>
          <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); setBarcodeEdits({}); }}>
            <SelectTrigger>
              <SelectValue placeholder="Välj en artikel..." />
            </SelectTrigger>
            <SelectContent>
              {articleNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Barcode table */}
        {selectedArticle && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{selectedArticle}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{articleItems.length} storleksvarianter</p>
              </div>
              {hasEdits && (
                <Button onClick={saveAll} disabled={savingId === 'all'} size="sm" className="gap-2">
                  {savingId === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Spara alla
                </Button>
              )}
            </div>

            {articleItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Inga storleksvarianter hittades för denna artikel.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {articleItems.map(item => {
                  const barcode = getCurrentBarcode(item);
                  const isEdited = barcodeEdits[item.id] !== undefined;
                  const duplicate = getDuplicateWarning(item);
                  const isEmpty = !barcode;

                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4">
                      {/* Size badge */}
                      <div className="flex items-center gap-3 sm:w-28 shrink-0">
                        <Badge variant="outline" className="text-sm px-3 py-1 min-w-[3rem] justify-center">
                          {item.size || '—'}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">({item.quantity || 0} st)</span>
                      </div>

                      {/* Barcode input */}
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={barcode}
                          onChange={(e) => handleBarcodeChange(item.id, e.target.value)}
                          placeholder="Ange streckkod..."
                          className="flex-1"
                        />

                        {/* Status icon */}
                        {duplicate ? (
                          <div className="shrink-0" title={duplicate}>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          </div>
                        ) : isEmpty ? (
                          <div className="shrink-0" title="Streckkod saknas">
                            <Minus className="w-5 h-5 text-amber-500" />
                          </div>
                        ) : (
                          <div className="shrink-0" title="OK">
                            <Check className="w-5 h-5 text-green-500" />
                          </div>
                        )}

                        {/* Save button per row */}
                        {isEdited && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveBarcode(item)}
                            disabled={savingId === item.id}
                            className="shrink-0"
                          >
                            {savingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>

                      {/* Duplicate warning text (mobile) */}
                      {duplicate && (
                        <p className="text-xs text-red-500 sm:hidden">{duplicate}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Duplicate warning text (desktop) */}
            {articleItems.some(item => getDuplicateWarning(item)) && (
              <div className="hidden sm:block p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Varning: Vissa streckkoder används redan av andra artiklar.
                </p>
              </div>
            )}
          </div>
        )}

        {!selectedArticle && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Välj en artikel ovan för att hantera streckkoder.
          </div>
        )}
      </div>
    </div>
  );
}