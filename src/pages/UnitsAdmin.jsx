import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useGlobalConfig, useSaveGlobalConfig } from '@/hooks/useGlobalConfig';
import { MENU_GROUPS, ALL_MENU_IDS, UNIT_NAV_CONFIG_KEY } from '@/lib/unitMenus';
import UnitEditorDialog from '@/components/admin/UnitEditorDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Loader2, ShieldAlert, Users, MapPin, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function UnitsAdmin() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isOwner = me?.role === 'ägare';

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
    enabled: isOwner,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    enabled: isOwner,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    enabled: isOwner,
  });

  const { data: navConfig } = useGlobalConfig(UNIT_NAV_CONFIG_KEY);
  const saveConfig = useSaveGlobalConfig();

  const configValue = navConfig?.config_value || {};

  const handleSave = async ({ name, description, is_active, menus }) => {
    setSaving(true);
    try {
      let unitId = editingUnit?.id;
      if (editingUnit) {
        await base44.entities.Unit.update(unitId, { name, description, is_active });
      } else {
        const created = await base44.entities.Unit.create({ name, description, is_active: true });
        unitId = created.id;
      }
      await saveConfig.mutateAsync({
        configKey: UNIT_NAV_CONFIG_KEY,
        configValue: { ...configValue, [unitId]: menus },
      });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(editingUnit ? 'Enheten uppdaterad' : 'Enheten skapad');
      setDialogOpen(false);
      setEditingUnit(null);
    } catch (err) {
      toast.error('Kunde inte spara: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (meLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-3xl mx-auto bg-slate-100 dark:bg-gray-900 border border-[#E2E8F0] dark:border-gray-800 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-[#8B1E1E]" />
          </div>
          <Badge variant="outline" className="mb-3">Endast ägare har åtkomst</Badge>
          <p className="text-sm text-gray-500">Den här sidan är begränsad till ägarrollen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#0F172A] dark:text-gray-100">Enheter</h1>
            <Badge variant="secondary">{units.length}</Badge>
          </div>
          <Button
            onClick={() => { setEditingUnit(null); setDialogOpen(true); }}
            className="bg-[#8B1E1E] hover:bg-[#731818]"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Lägg till enhet</span>
          </Button>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-900 border border-[#E2E8F0] dark:border-gray-800 rounded-2xl overflow-hidden">
          {unitsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : units.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Inga enheter ännu. Skapa din första enhet.
            </div>
          ) : (
            units.map((unit, i) => {
              const memberCount = members.filter(m => m.unit_id === unit.id).length;
              const locationCount = locations.filter(l => l.unit_id === unit.id).length;
              const menus = configValue[unit.id] || ALL_MENU_IDS;
              return (
                <button
                  key={unit.id}
                  onClick={() => { setEditingUnit(unit); setDialogOpen(true); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FDF2F2] dark:bg-[#8B1E1E]/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#8B1E1E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#0F172A] dark:text-gray-100">{unit.name}</span>
                      {unit.is_active === false ? (
                        <Badge variant="secondary" className="text-[11px]">Inaktiv</Badge>
                      ) : (
                        <Badge className="bg-[#FDF2F2] text-[#8B1E1E] hover:bg-[#FDF2F2] text-[11px]">Aktiv</Badge>
                      )}
                    </div>
                    {unit.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{unit.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[12px] font-medium text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{memberCount}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{locationCount}</span>
                      <span>{menus.length}/{MENU_GROUPS.length} menyer</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              );
            })
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Enheter håller platser, personal och maskiner separata. Befintlig data flyttas inte automatiskt.
        </p>
      </div>

      <UnitEditorDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingUnit(null); }}
        unit={editingUnit}
        menus={editingUnit ? (configValue[editingUnit.id] || ALL_MENU_IDS) : ALL_MENU_IDS}
        onSave={handleSave}
        isSaving={saving}
      />
    </div>
  );
}