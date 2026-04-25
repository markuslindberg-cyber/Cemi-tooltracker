import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'verktygsförvaltare', label: 'Verktygsförvaltare' },
  { id: 'admin_lokalvård', label: 'Admin Lokalvård' },
  { id: 'lokalvårdare', label: 'Lokalvårdare' },
];

const ENTITIES = [
  { id: 'Tool', label: 'Maskiner' },
  { id: 'HandTool', label: 'Handredskap' },
  { id: 'ArbetskläderUtrustning', label: 'Arbetskläder & Utrustning' },
  { id: 'LokalvardsArtikel', label: 'Lokalvårdsartiklar' },
  { id: 'Location', label: 'Platser' },
  { id: 'TeamMember', label: 'Personal' },
  { id: 'Huvudmaskin', label: 'Huvudmaskiner' },
  { id: 'LoanRequest', label: 'Lånebegäran' },
  { id: 'ServiceRecord', label: 'Service' },
  { id: 'Transfer', label: 'Överföringar' },
  { id: 'Kund', label: 'Kunder' },
  { id: 'Uttag', label: 'Uttag' },
  { id: 'WorkwearRequest', label: 'Begäran arbetskläder' },
  { id: 'LokalvardArtikelRequest', label: 'Begäran lokalvård' },
  { id: 'Category', label: 'Kategorier' },
];

const OPERATIONS = [
  { id: 'can_create', label: 'Skapa' },
  { id: 'can_read', label: 'Läsa' },
  { id: 'can_update', label: 'Uppdatera' },
  { id: 'can_delete', label: 'Radera' },
];

function makeKey(role, entity) {
  return `${role}__${entity}`;
}

export default function RollBehorigheter() {
  const queryClient = useQueryClient();
  const [localPerms, setLocalPerms] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => base44.entities.RolePermission.list('-created_date', 500),
  });

  // Build a lookup from saved permissions
  const savedLookup = useMemo(() => {
    const map = {};
    permissions.forEach(p => {
      map[makeKey(p.role_name, p.entity_name)] = p;
    });
    return map;
  }, [permissions]);

  // Initialize local state from saved data
  useEffect(() => {
    const local = {};
    ROLES.forEach(role => {
      ENTITIES.forEach(entity => {
        const key = makeKey(role.id, entity.id);
        const saved = savedLookup[key];
        local[key] = {
          can_create: saved?.can_create ?? false,
          can_read: saved?.can_read ?? false,
          can_update: saved?.can_update ?? false,
          can_delete: saved?.can_delete ?? false,
        };
      });
    });
    setLocalPerms(local);
    setDirty(false);
  }, [savedLookup]);

  const togglePerm = (role, entity, op) => {
    const key = makeKey(role, entity);
    setLocalPerms(prev => ({
      ...prev,
      [key]: { ...prev[key], [op]: !prev[key]?.[op] },
    }));
    setDirty(true);
  };

  const toggleAllForRole = (role, op) => {
    const allChecked = ENTITIES.every(e => localPerms[makeKey(role, e.id)]?.[op]);
    setLocalPerms(prev => {
      const next = { ...prev };
      ENTITIES.forEach(e => {
        const key = makeKey(role, e.id);
        next[key] = { ...next[key], [op]: !allChecked };
      });
      return next;
    });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const ops = [];
      ROLES.forEach(role => {
        ENTITIES.forEach(entity => {
          const key = makeKey(role.id, entity.id);
          const local = localPerms[key];
          const saved = savedLookup[key];
          if (saved) {
            // Update if changed
            if (
              saved.can_create !== local.can_create ||
              saved.can_read !== local.can_read ||
              saved.can_update !== local.can_update ||
              saved.can_delete !== local.can_delete
            ) {
              ops.push(base44.entities.RolePermission.update(saved.id, local));
            }
          } else {
            // Create if any permission is true
            if (local.can_create || local.can_read || local.can_update || local.can_delete) {
              ops.push(base44.entities.RolePermission.create({
                role_name: role.id,
                entity_name: entity.id,
                ...local,
              }));
            }
          }
        });
      });
      await Promise.all(ops);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Behörigheter sparade');
      setDirty(false);
    },
    onError: (err) => {
      toast.error('Kunde inte spara: ' + err.message);
    },
  });

  const [selectedRole, setSelectedRole] = useState(ROLES[0].id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8B1E1E]/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#8B1E1E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roller & Behörigheter</h1>
            <p className="text-sm text-gray-500">Hantera vad varje roll kan göra i systemet</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!dirty}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['role-permissions'] })}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Ångra
          </Button>
          <Button
            size="sm"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Spara ändringar
          </Button>
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 flex-wrap">
        {ROLES.map(role => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRole === role.id
                ? 'bg-[#8B1E1E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Quick toggle row */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Markera alla:</span>
        {OPERATIONS.map(op => {
          const allChecked = ENTITIES.every(e => localPerms[makeKey(selectedRole, e.id)]?.[op.id]);
          return (
            <button
              key={op.id}
              onClick={() => toggleAllForRole(selectedRole, op.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                allChecked
                  ? 'bg-[#8B1E1E]/10 text-[#8B1E1E]'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {op.label}
            </button>
          );
        })}
      </div>

      {/* Permissions table */}
      <div className="bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Entitet</th>
                {OPERATIONS.map(op => (
                  <th key={op.id} className="text-center px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">
                    {op.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ENTITIES.map(entity => {
                const key = makeKey(selectedRole, entity.id);
                const perms = localPerms[key] || {};
                return (
                  <tr key={entity.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{entity.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{entity.id}</span>
                    </td>
                    {OPERATIONS.map(op => (
                      <td key={op.id} className="text-center px-4 py-3">
                        <Checkbox
                          checked={perms[op.id] ?? false}
                          onCheckedChange={() => togglePerm(selectedRole, entity.id, op.id)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Obs: Ägare har alltid full behörighet och kan inte begränsas. Ändringar här påverkar appens mjuka behörighetskontroller.
      </p>
    </div>
  );
}