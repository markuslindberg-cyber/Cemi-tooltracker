import React, { useState, useEffect } from 'react';
import { useGlobalConfig, useSaveGlobalConfig } from '@/hooks/useGlobalConfig';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, LayoutDashboard, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const DEFAULT_WIDGET_ORDER = ALL_WIDGETS.map(w => ({ id: w.id, visible: true }));

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'maskiner', label: 'Maskiner' },
  { id: 'handredskap', label: 'Handredskap' },
  { id: 'arbetsklader', label: 'Arbetskläder' },
  { id: 'lokalvard', label: 'Lokalvård' },
  { id: 'inventering', label: 'Inventeringskontroll' },
  { id: 'administration', label: 'Administration' },
];

const DEFAULT_NAV_ORDER = ALL_NAV_ITEMS.map(n => ({ id: n.id, visible: true }));

function ReorderList({ items, allItems, onChange }) {
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

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const meta = allItems.find(a => a.id === item.id);
        return (
          <div key={item.id} className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
            item.visible
              ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 opacity-60"
          )}>
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{meta?.label}</span>
            <button onClick={() => toggle(item.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              {item.visible
                ? <Eye className="w-4 h-4 text-green-500" />
                : <EyeOff className="w-4 h-4 text-gray-400" />}
            </button>
            <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
              <ArrowUp className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
              <ArrowDown className="w-4 h-4 text-gray-500" />
            </button>
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
      setWidgetOrder(dashboardConfig.config_value.widgets);
    }
  }, [dashboardConfig]);

  useEffect(() => {
    if (navConfig?.config_value?.items) {
      setNavOrder(navConfig.config_value.items);
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
            Dashboard-widgets
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
            Menyordning
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          {activeTab === 'dashboard' ? (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Dashboard-widgets</h2>
              <p className="text-xs text-gray-400 mb-4">Ändra ordning och synlighet för varje widget på dashboarden</p>
              <ReorderList items={widgetOrder} allItems={ALL_WIDGETS} onChange={setWidgetOrder} />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Menyordning</h2>
              <p className="text-xs text-gray-400 mb-4">Ändra ordning och synlighet för menyalternativen i sidofältet</p>
              <ReorderList items={navOrder} allItems={ALL_NAV_ITEMS} onChange={setNavOrder} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}