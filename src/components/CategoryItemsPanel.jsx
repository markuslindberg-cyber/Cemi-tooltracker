import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, X, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Maps entity type to the path prefix for navigation
const ENTITY_ROUTES = {
  Tool: null, // Uses Inventory page with filter — we'll just show info
  HandTool: null,
  'ArbetskläderUtrustning': null,
  LokalvardsArtikel: null,
};

// Maps entity type to entity fetcher
const ENTITY_FETCHERS = {
  Tool: (category) => base44.entities.Tool.filter({ category }, null, 100000),
  HandTool: (category) => base44.entities.HandTool.filter({ category }, null, 100000),
  'ArbetskläderUtrustning': (category) => base44.entities.ArbetskläderUtrustning.filter({ category }, null, 100000),
  LokalvardsArtikel: (category) => base44.entities.LokalvardsArtikel.filter({ category }, null, 100000),
};

const ENTITY_LABELS = {
  Tool: 'Maskiner',
  HandTool: 'Handredskap',
  'ArbetskläderUtrustning': 'Arbetskläder',
  LokalvardsArtikel: 'Lokalvård – Lager',
};

const ENTITY_PAGE_PATHS = {
  Tool: '/Inventory',
  HandTool: '/HandTools',
  'ArbetskläderUtrustning': '/ArbetskladerUtrustning',
  LokalvardsArtikel: '/Lokalvard/Lager',
};

// Returns the display name for an item depending on entity type
function getItemName(item, entityType) {
  if (entityType === 'LokalvardsArtikel') return item.benamning || item.name || '–';
  return item.name || '–';
}

function getItemSubtitle(item, entityType) {
  if (entityType === 'LokalvardsArtikel') return item.artikelnummer || item.streckkod || '';
  if (entityType === 'Tool') return item.model_number || item.manufacturer || '';
  if (entityType === 'HandTool') return item.manufacturer || '';
  if (entityType === 'ArbetskläderUtrustning') return item.subcategory || '';
  return '';
}

export default function CategoryItemsPanel({ category, onClose }) {
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['categoryItems', category.entity_type, category.name],
    queryFn: () => {
      const fetcher = ENTITY_FETCHERS[category.entity_type];
      if (!fetcher) return [];
      return fetcher(category.name);
    },
    enabled: !!category,
  });

  const handleItemClick = (item) => {
    const entityType = category.entity_type;
    if (entityType === 'LokalvardsArtikel' && item.artikelnummer) {
      navigate(`/Lokalvard/Artikel/${item.artikelnummer}`, { state: { from: '/Administration/Kategorier' } });
    } else {
      // For other types, navigate to the list page with a back state
      navigate(ENTITY_PAGE_PATHS[entityType] || '/', { state: { from: '/Administration/Kategorier' } });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{category.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{ENTITY_LABELS[category.entity_type] || category.entity_type}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Go to list page */}
        <div className="px-5 py-3 border-b border-gray-100">
          <button
            onClick={() => navigate(ENTITY_PAGE_PATHS[category.entity_type] || '/', { state: { from: '/Administration/Kategorier' } })}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Öppna {ENTITY_LABELS[category.entity_type]}-sidan
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Inga artiklar i denna kategori</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => {
                const name = getItemName(item, category.entity_type);
                const subtitle = getItemSubtitle(item, category.entity_type);
                const isLokalvard = category.entity_type === 'LokalvardsArtikel' && item.artikelnummer;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleItemClick(item)}
                      className={`w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors ${isLokalvard ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isLokalvard ? 'text-blue-700 hover:underline' : 'text-gray-900'}`}>
                          {name}
                        </p>
                        {subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>}
                        {item.subcategory && (
                          <p className="text-xs text-gray-400 truncate">Underkategori: {item.subcategory}</p>
                        )}
                      </div>
                      {isLokalvard && <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {items.length} {items.length === 1 ? 'artikel' : 'artiklar'} i kategorin
        </div>
      </div>
    </div>
  );
}