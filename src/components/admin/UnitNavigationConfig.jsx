import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useGlobalConfig, useSaveGlobalConfig } from '@/hooks/useGlobalConfig';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RotateCcw, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const MENU_GROUPS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'maskiner', label: 'Maskiner' },
  { id: 'handredskap', label: 'Handredskap' },
  { id: 'arbetsklader', label: 'Arbetskläder' },
  { id: 'lokalvard', label: 'Lokalvård' },
  { id: 'inventering', label: 'Inventeringskontroll' },
  { id: 'materialbanken', label: 'Materialbanken' },
  { id: 'administration', label: 'Administration' },
];

const CONFIG_KEY = 'unit_navigation_config';

export default function UnitNavigationConfig() {
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: savedConfig, isLoading: configLoading } = useGlobalConfig(CONFIG_KEY);
  const saveConfig = useSaveGlobalConfig();

  const [localConfig, setLocalConfig] = useState({});
  const [dirty, setDirty] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  // Initialize local config from saved data
  useEffect(() => {
    if (units.length === 0) return;
    if (!selectedUnitId) setSelectedUnitId(units[0]?.id);

    const saved = savedConfig?.config_value || {};
    const config = {};
    units.forEach(unit => {
      config[unit.id] = saved[unit.id] || MENU_GROUPS.map(g => g.id);
    });
    setLocalConfig(config);
    setDirty(false);
  }, [savedConfig, units]);

  const toggleMenu = (unitId, menuId) => {
    setLocalConfig(prev => {
      const current = prev[unitId] || MENU_GROUPS.map(g => g.id);
      const next = current.includes(menuId)
        ? current.filter(id => id !== menuId)
        : [...current, menuId];
      return { ...prev, [unitId]: next };
    });
    setDirty(true);
  };

  const toggleAll = (unitId) => {
    const current = localConfig[unitId] || [];
    const allChecked = MENU_GROUPS.every(g => current.includes(g.id));
    setLocalConfig(prev => ({
      ...prev,
      [unitId]: allChecked ? [] : MENU_GROUPS.map(g => g.id),
    }));
    setDirty(true);
  };

  const handleSave = () => {
    saveConfig.mutate(
      { configKey: CONFIG_KEY, configValue: localConfig },
      {
        onSuccess: () => {
          toast.success('Enhetsinställningar sparade');
          setDirty(false);
        },
        onError: (err) => toast.error('Kunde inte spara: ' + err.message),
      }
    );
  };

  const handleReset = () => {
    const saved = savedConfig?.config_value || {};
    const config = {};
    units.forEach(unit => {
      config[unit.id] = saved[unit.id] || MENU_GROUPS.map(g => g.id);
    });
    setLocalConfig(config);
    setDirty(false);
  };

  if (unitsLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Inga enheter hittades. Skapa enheter först.
      </div>
    );
  }

  const currentMenus = localConfig[selectedUnitId] || [];
  const allChecked = MENU_GROUPS.every(g => currentMenus.includes(g.id));

  return (
    <div className="space-y-4">
      {/* Save/Reset buttons */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Välj vilka menygrupper som ska vara synliga för varje enhet.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!dirty} onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Ångra
          </Button>
          <Button
            size="sm"
            disabled={!dirty || saveConfig.isPending}
            onClick={handleSave}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Spara
          </Button>
        </div>
      </div>

      {/* Unit selector */}
      <div className="flex gap-2 flex-wrap">
        {units.map(unit => (
          <button
            key={unit.id}
            onClick={() => setSelectedUnitId(unit.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedUnitId === unit.id
                ? 'bg-[#8B1E1E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {unit.name}
          </button>
        ))}
      </div>

      {/* Toggle all */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Markera alla:</span>
        <button
          onClick={() => toggleAll(selectedUnitId)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            allChecked
              ? 'bg-[#8B1E1E]/10 text-[#8B1E1E] dark:bg-[#8B1E1E]/20 dark:text-red-300'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Synlig
        </button>
      </div>

      {/* Menu groups table */}
      <div className="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Menygrupp</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 w-24">Synlig</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {MENU_GROUPS.map(group => (
              <tr key={group.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.label}</span>
                </td>
                <td className="text-center px-4 py-3">
                  <Checkbox
                    checked={currentMenus.includes(group.id)}
                    onCheckedChange={() => toggleMenu(selectedUnitId, group.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Om ingen konfiguration finns för en enhet visas alla menygrupper som standard. Rollbaserad behörighet gäller fortfarande.
      </p>
    </div>
  );
}