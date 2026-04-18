import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Pencil, Check, X, ChevronDown, ChevronRight, Tag, Layers, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_LABELS = {
  Tool: 'Maskiner',
  HandTool: 'Handredskap',
  'ArbetskläderUtrustning': 'Arbetskläder',
  LokalvardsArtikel: 'Lokalvård – Lager',
};

const ENTITY_COLORS = {
  Tool: 'bg-blue-100 text-blue-700',
  HandTool: 'bg-green-100 text-green-700',
  'ArbetskläderUtrustning': 'bg-purple-100 text-purple-700',
  LokalvardsArtikel: 'bg-orange-100 text-orange-700',
};

function EditableField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const handleSave = () => {
    if (val.trim() && val.trim() !== value) onSave(val.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          className="border border-gray-300 rounded px-2 py-0.5 text-sm w-48 focus:outline-none focus:border-blue-400"
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
        <button onClick={() => { setVal(value); setEditing(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 group">
      {value}
      <button onClick={() => { setVal(value); setEditing(true); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

// Warning dialog when category has items
function DeleteBlockedDialog({ count, entityLabel, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Kan inte radera kategorin</h2>
            <p className="text-sm text-gray-600 mt-1">
              Det finns <strong>{count} {entityLabel.toLowerCase()}</strong> som använder den här kategorin.
              Du måste byta kategori på dem innan du kan radera.
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          Gå till respektive sida, filtrera på kategorin och byt kategori på alla poster. Kom sedan tillbaka hit och försök igen.
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Stäng</Button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ category, itemCount, onUpdateName, onUpdateSubcat, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Är du säker på att du vill radera kategorin "${category.name}"?`)) return;
    setDeleting(true);
    await onDelete(category);
    setDeleting(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <Tag className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 font-medium text-gray-900" onClick={e => e.stopPropagation()}>
          <EditableField value={category.name} onSave={(newName) => onUpdateName(category, newName)} />
        </div>
        <Badge className={`text-xs ${ENTITY_COLORS[category.entity_type]}`}>
          {ENTITY_LABELS[category.entity_type] || category.entity_type}
        </Badge>
        {/* Item count badge */}
        {itemCount !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${itemCount > 0 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-400'}`}>
            {itemCount} {itemCount === 1 ? 'artikel' : 'artiklar'}
          </span>
        )}
        <span className="text-xs text-gray-400">{(category.subcategories || []).length} underkategorier</span>
        {/* Delete button */}
        <button
          onClick={e => { e.stopPropagation(); handleDelete(); }}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 ml-1 text-gray-300 hover:text-red-500 transition-colors"
          title="Radera kategori"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
          {(category.subcategories || []).length === 0 ? (
            <p className="text-sm text-gray-400 italic">Inga underkategorier registrerade</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {category.subcategories.map((sub, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                  <Layers className="w-3 h-3 text-gray-400 shrink-0" />
                  <EditableField value={sub} onSave={(newSub) => onUpdateSubcat(category, sub, newSub)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoryManagement() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [blockedDialog, setBlockedDialog] = useState(null); // { count, entityLabel }

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(null, 100000),
  });

  const { data: countsData } = useQuery({
    queryKey: ['categoryCounts'],
    queryFn: () => base44.functions.invoke('getCategoryCounts', {}).then(r => r.data.counts),
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncCategories', {});
      const { created, updated } = res.data;
      toast.success(`Synkronisering klar! ${created} skapade, ${updated} uppdaterade.`);
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categoryCounts']);
    } catch (err) {
      toast.error('Fel vid synkronisering: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateName = async (category, newName) => {
    try {
      const res = await base44.functions.invoke('updateCategoryName', {
        categoryId: category.id,
        oldName: category.name,
        newName,
        entityType: category.entity_type,
      });
      toast.success(`Kategori uppdaterad! ${res.data.updatedCount} poster påverkade.`);
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categoryCounts']);
    } catch (err) {
      toast.error('Fel: ' + err.message);
    }
  };

  const handleUpdateSubcat = async (category, oldSubcat, newSubcat) => {
    try {
      const res = await base44.functions.invoke('updateSubcategoryName', {
        categoryId: category.id,
        oldSubcat,
        newSubcat,
        entityType: category.entity_type,
        categoryName: category.name,
      });
      toast.success(`Underkategori uppdaterad! ${res.data.updatedCount} poster påverkade.`);
      queryClient.invalidateQueries(['categories']);
    } catch (err) {
      toast.error('Fel: ' + err.message);
    }
  };

  const handleDelete = async (category) => {
    try {
      const res = await base44.functions.invoke('deleteCategory', {
        categoryId: category.id,
        categoryName: category.name,
        entityType: category.entity_type,
      });
      if (res.data?.error === 'ITEMS_EXIST') {
        setBlockedDialog({ count: res.data.count, entityLabel: ENTITY_LABELS[category.entity_type] || 'poster' });
        return;
      }
      toast.success(`Kategorin "${category.name}" raderades.`);
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categoryCounts']);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'ITEMS_EXIST') {
        setBlockedDialog({ count: data.count, entityLabel: ENTITY_LABELS[category.entity_type] || 'poster' });
      } else {
        toast.error('Fel vid radering: ' + (err.message || 'Okänt fel'));
      }
    }
  };

  const entityTypes = ['all', ...Object.keys(ENTITY_LABELS)];

  const filtered = filterType === 'all'
    ? categories
    : categories.filter(c => c.entity_type === filterType);

  const grouped = {};
  filtered.forEach(cat => {
    const key = cat.entity_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cat);
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {blockedDialog && (
        <DeleteBlockedDialog
          count={blockedDialog.count}
          entityLabel={blockedDialog.entityLabel}
          onClose={() => setBlockedDialog(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategorier</h1>
          <p className="text-sm text-gray-500 mt-1">Hantera kategori- och underkategorinamn globalt i appen</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="bg-[#8B1E1E] hover:bg-[#7a1a1a] gap-2">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Synkronisera kategorier
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <strong>Tips:</strong> Klicka på "Synkronisera kategorier" för att hämta alla kategorier. Hovra över ett kategorinamn för att redigera det – ändringen uppdateras automatiskt på alla poster i appen.
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {entityTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === type
                ? 'bg-[#8B1E1E] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type === 'all' ? 'Alla' : ENTITY_LABELS[type]}
            {type !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({categories.filter(c => c.entity_type === type).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Inga kategorier hittades</p>
          <p className="text-sm mt-1">Klicka på "Synkronisera kategorier" för att hämta alla kategorier från systemet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([entityType, cats]) => (
            <div key={entityType}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-gray-700">{ENTITY_LABELS[entityType] || entityType}</h2>
                <span className="text-xs text-gray-400">({cats.length} kategorier)</span>
              </div>
              <div className="space-y-2">
                {cats.sort((a, b) => a.name.localeCompare(b.name, 'sv')).map(cat => {
                  const countKey = `${cat.entity_type}::${cat.name}`;
                  const itemCount = countsData ? (countsData[countKey] || 0) : undefined;
                  return (
                    <div key={cat.id} className="group">
                      <CategoryRow
                        category={cat}
                        itemCount={itemCount}
                        onUpdateName={handleUpdateName}
                        onUpdateSubcat={handleUpdateSubcat}
                        onDelete={handleDelete}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}