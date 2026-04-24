import React, { useState, useEffect } from 'react';
import { useGlobalConfig, useSaveGlobalConfig } from '@/hooks/useGlobalConfig';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, LayoutDashboard, Menu, ChevronRight, ChevronDown, PanelLeft, PanelRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Dashboard widgets
const ALL_WIDGETS = [
  { id: 'stats', label: 'Statistikkort (antal maskiner, tillgängliga, etc.)' },
  { id: 'loan_alert', label: 'Låneförfrågan-varning' },
  { id: 'missing_alert', label: 'Saknade verktyg-varning' },
  { id: 'loan_summary', label: 'Låneöversikt' },
  { id: 'pending_chart', label: 'Väntande begäranden (diagram)' },
  { id: 'inventory_value', label: 'Inventarievärde' },
  { id: 'loans_by_location', label: 'Platser med aktiva lån' },
  { id: 'recent_transfers', label: 'Senaste förflyttningar' },
  { id: 'recent_tools', label: 'Senaste maskiner (lista)' },
];
// Widgets that can be in main or sidebar (wide widgets are always main)
const SIDEBAR_CAPABLE = ['loan_summary', 'pending_chart', 'inventory_value', 'loans_by_location', 'recent_transfers'];
const ALWAYS_MAIN = ['stats', 'loan_alert', 'missing_alert', 'recent_tools'];

const DEFAULT_WIDGET_ORDER = ALL_WIDGETS.map(w => ({
  id: w.id,
  visible: true,
  column: SIDEBAR_CAPABLE.includes(w.id) ? 'sidebar' : 'main',
}));

// Navigation menu items and their children
const ALL_NAV_ITEMS = [
  {
    id: 'dashboard', label: 'Dashboard', children: []
  },
  {
    id: 'maskiner', label: 'Maskiner', children: [
      { id: 'maskiner_oversikt', label: 'Översikt' },
      { id: 'maskiner_huvudmaskiner', label: 'Huvudmaskiner' },
      { id: 'maskiner_salda', label: 'Sålda & Kasserade' },
      { id: 'maskiner_lan', label: 'Lån av utrustning' },
      { id: 'maskiner_service', label: 'Service' },
    ]
  },
  {
    id: 'handredskap', label: 'Handredskap', children: []
  },
  {
    id: 'arbetsklader', label: 'Arbetskläder', children: [
      { id: 'arbetsklader_utrustning', label: 'Arbetskläder och skyddsutrustning' },
      { id: 'arbetsklader_rapporter', label: 'Uttagsrapporter' },
      { id: 'arbetsklader_begaran', label: 'Begäran - arbetskläder' },
      { id: 'arbetsklader_forfragan', label: 'Förfrågan - arbetskläder' },
    ]
  },
  {
    id: 'lokalvard', label: 'Lokalvård', children: [
      { id: 'lokalvard_begaran', label: 'Begäran - lokalvårdsartiklar' },
      { id: 'lokalvard_lager', label: 'Lager' },
      { id: 'lokalvard_nyttuttag', label: 'Plocka ut begärda uttag' },
      { id: 'lokalvard_uttag', label: 'Uttag' },
      { id: 'lokalvard_godkanna', label: 'Godkänna Begäran' },
      { id: 'lokalvard_kostnad', label: 'Kostnad per kund' },
      { id: 'lokalvard_kunder', label: 'Kunder' },
    ]
  },
  {
    id: 'inventering', label: 'Inventeringskontroll', children: [
      { id: 'inventering_inventering', label: 'Inventering' },
      { id: 'inventering_rapporter', label: 'Inventeringsrapporter' },
    ]
  },
  {
    id: 'administration', label: 'Administration', children: [
      { id: 'administration_platser', label: 'Platser' },
      { id: 'administration_personal', label: 'Personal' },
      { id: 'administration_kategorier', label: 'Kategorier' },
    ]
  },
];

const DEFAULT_NAV_ORDER = ALL_NAV_ITEMS.map(n => ({
  id: n.id,
  visible: true,
  children: n.children.map(c => ({ id: c.id, visible: true })),
}));

function ReorderList({ items, allItems, onChange, showColumn = false }) {
  const move = (index, dir) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const toggle = (id) => {
    onChange(items.map(i => i.id === id ? { ...i, visible: !i.visible } : i));
  };

  const toggleColumn = (id) => {
    onChange(items.map(i => i.id === id ? { ...i, column: i.column === 'sidebar' ? 'main' : 'sidebar' } : i));
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const meta = allItems.find(a => a.id === item.id);
        const canChangeSide = showColumn && SIDEBAR_CAPABLE.includes(item.id);
        return (
          <div key={item.id} className={cn(
            "flex items-center gap-2 p-3 rounded-xl border transition-colors",
            item.visible
              ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 opacity-60"
          )}>
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0 truncate">{meta?.label}</span>
            {showColumn && (
              <button
                onClick={() => canChangeSide && toggleColumn(item.id)}
                title={canChangeSide ? (item.column === 'sidebar' ? 'Sidofält → Flytta till huvud' : 'Huvud → Flytta till sidofält') : 'Alltid i huvud'}
                className={cn(
                  "p-1 rounded transition-colors text-xs shrink-0",
                  canChangeSide ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" : "opacity-30 cursor-default"
                )}
              >
                {!canChangeSide || item.column === 'main'
                  ? <PanelLeft className="w-4 h-4 text-blue-500" />
                  : <PanelRight className="w-4 h-4 text-purple-500" />}
              </button>
            )}
            <button onClick={() => toggle(item.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
              {item.visible
                ? <Eye className="w-4 h-4 text-green-500" />
                : <EyeOff className="w-4 h-4 text-gray-400" />}
            </button>
            <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 shrink-0">
              <ArrowUp className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 shrink-0">
              <ArrowDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NavGroupEditor({ group, allGroup, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = allGroup.children?.length > 0;

  const toggleVisible = () => onChange({ ...group, visible: !group.visible });

  const moveChild = (index, dir) => {
    const next = [...(group.children || [])];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...group, children: next });
  };

  const toggleChild = (id) => {
    onChange({ ...group, children: (group.children || []).map(c => c.id === id ? { ...c, visible: !c.visible } : c) });
  };

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      group.visible ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 opacity-60"
    )}>
      <div className="flex items-center gap-2 p-3">
        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{allGroup.label}</span>
        {hasChildren && (
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
        )}
        <button onClick={toggleVisible} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
          {group.visible ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
      {expanded && hasChildren && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-2 ml-4">
          {(group.children || []).map((child, idx) => {
            const childMeta = allGroup.children.find(c => c.id === child.id);
            return (
              <div key={child.id} className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                child.visible ? "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700" : "bg-white dark:bg-gray-900 border-gray-50 opacity-50"
              )}>
                <GripVertical className="w-3 h-3 text-gray-300 shrink-0" />
                <span className="flex-1 text-gray-600 dark:text-gray-300 min-w-0 truncate">{childMeta?.label}</span>
                <button onClick={() => toggleChild(child.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
                  {child.visible ? <Eye className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                <button onClick={() => moveChild(idx, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 shrink-0">
                  <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button onClick={() => moveChild(idx, 1)} disabled={idx === (group.children || []).length - 1} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 shrink-0">
                  <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavGroupList({ items, onChange }) {
  const move = (index, dir) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const allGroup = ALL_NAV_ITEMS.find(n => n.id === item.id);
        return (
          <div key={item.id} className="flex items-start gap-1">
            <div className="flex-1">
              <NavGroupEditor
                group={item}
                allGroup={allGroup}
                onChange={(updated) => {
                  const next = [...items];
                  next[index] = updated;
                  onChange(next);
                }}
              />
            </div>
            <div className="flex flex-col gap-0.5 pt-3 shrink-0">
              <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                <ArrowUp className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                <ArrowDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminLayoutEditor() {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: () => base44.auth.me() });
  const { data: dashboardConfig } = useGlobalConfig('dashboard_layout');
  const { data: navConfig } = useGlobalConfig('navigation_order');
  const saveConfig = useSaveGlobalConfig();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_WIDGET_ORDER);
  const [navOrder, setNavOrder] = useState(DEFAULT_NAV_ORDER);

  useEffect(() => {
    if (dashboardConfig?.config_value?.widgets) {
      // Merge saved with defaults to handle new widgets
      const saved = dashboardConfig.config_value.widgets;
      const merged = DEFAULT_WIDGET_ORDER.map(def => {
        const found = saved.find(s => s.id === def.id);
        return found ? { ...def, ...found } : def;
      });
      setWidgetOrder(merged);
    }
  }, [dashboardConfig]);

  useEffect(() => {
    if (navConfig?.config_value?.items) {
      const saved = navConfig.config_value.items;
      const merged = DEFAULT_NAV_ORDER.map(def => {
        const found = saved.find(s => s.id === def.id);
        if (!found) return def;
        return {
          ...def,
          ...found,
          children: def.children.map(dc => {
            const fc = (found.children || []).find(c => c.id === dc.id);
            return fc ? { ...dc, ...fc } : dc;
          }),
        };
      });
      setNavOrder(merged);
    }
  }, [navConfig]);

  if (user?.role !== 'ägare') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Endast ägare har åtkomst till den här sidan.</p>
      </div>
    );
  }

  const handleSave = async () => {
    await Promise.all([
      saveConfig.mutateAsync({ configKey: 'dashboard_layout', configValue: { widgets: widgetOrder } }),
      saveConfig.mutateAsync({ configKey: 'navigation_order', configValue: { items: navOrder } }),
    ]);
    toast.success('Layouten sparad för alla användare!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Layoutredigerare</h1>
            <p className="text-sm text-gray-500 mt-1">Ändringar gäller för alla användare i appen</p>
          </div>
          <Button onClick={handleSave} className="bg-[#8B1E1E] hover:bg-[#6B1515]" disabled={saveConfig.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveConfig.isPending ? 'Sparar...' : 'Spara'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'dashboard'
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('nav')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'nav'
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Menu className="w-4 h-4" />
            Meny
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          {activeTab === 'dashboard' ? (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Dashboard-widgets</h2>
              <p className="text-xs text-gray-400 mb-3">Ändra ordning, synlighet och placering för varje widget.</p>
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><PanelLeft className="w-3.5 h-3.5 text-blue-500" /> = Huvudyta (vänster/bred)</span>
                <span className="flex items-center gap-1"><PanelRight className="w-3.5 h-3.5 text-purple-500" /> = Sidofält (höger)</span>
              </div>
              <ReorderList items={widgetOrder} allItems={ALL_WIDGETS} onChange={setWidgetOrder} showColumn={true} />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Menyordning</h2>
              <p className="text-xs text-gray-400 mb-4">Ändra ordning och synlighet. Klicka på pilen för att se undersidor.</p>
              <NavGroupList items={navOrder} onChange={setNavOrder} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}