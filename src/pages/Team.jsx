import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TeamMemberFormModal from '@/components/modals/TeamMemberFormModal';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import InactivateUserDialog from '@/components/modals/InactivateUserDialog';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MobileSelect from '@/components/ui/mobile-select';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Users,
  MapPin,
  Phone,
  Mail,
  Wrench,
  Grid,
  List,
  LogIn,
  Clock,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUnit } from '@/hooks/useUnitContext';
import InviteUserDialog from '@/components/modals/InviteUserDialog';

const roleConfig = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  'admin lokalvård': { label: 'Admin Lokalvård', color: 'bg-red-100 text-red-700' },
  'admin_lokalvård': { label: 'Admin Lokalvård', color: 'bg-red-100 text-red-700' },
  lokalvårdare: { label: 'Lokalvårdare', color: 'bg-orange-100 text-orange-700' },
  verktygsförvaltare: { label: 'Verktygsförvaltare', color: 'bg-blue-100 text-blue-700' },
  mekaniker: { label: 'Mekaniker', color: 'bg-teal-100 text-teal-700' },
  manager: { label: 'Chef', color: 'bg-emerald-100 text-emerald-700' },
  ägare: { label: 'Ägare', color: 'bg-purple-100 text-purple-700' },
  technician: { label: 'Tekniker', color: 'bg-blue-100 text-blue-700' },
  supervisor: { label: 'Arbetsledare', color: 'bg-purple-100 text-purple-700' },
  apprentice: { label: 'Lärling', color: 'bg-amber-100 text-amber-700' },
  contractor: { label: 'Underleverantör', color: 'bg-gray-100 text-gray-700' },
};

export default function Team() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [roleFilter, setRoleFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [editMember, setEditMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [memberToInactivate, setMemberToInactivate] = useState(null);
  const [inactivating, setInactivating] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const { toast } = useToast();
  const { activeUnitId } = useUnit();

  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const getUserInfo = (email) => {
    return appUsers.find(u => u.email === email);
  };

  const activeMembers = teamMembers.filter(m => m.is_active !== false);
  const inactiveMembers = teamMembers.filter(m => m.is_active === false);
  const currentTabMembers = activeTab === 'active' ? activeMembers : inactiveMembers;

  const filteredMembers = currentTabMembers.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim(), 'sv'));

  const availableRoles = [...new Set(teamMembers.map(m => m.role).filter(Boolean))].sort();

  const getToolCount = (memberEmail) => {
    return tools.filter(t => t.assigned_to_email === memberEmail).length;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const saveMemberMutation = useMutation({
    mutationFn: async (memberData) => {
      const shouldInvite = (memberData.send_invitation || memberData.send_new_invitation) && memberData.email;
      if (shouldInvite) {
        const inviteRole = (memberData.role === 'admin' || memberData.role === 'ägare') ? 'admin' : 'user';
        await base44.users.inviteUser(memberData.email, inviteRole);
      }
      const { send_invitation, send_new_invitation, ...data } = memberData;
      let result;
      if (editMember?.id) {
        result = await base44.entities.TeamMember.update(editMember.id, data);
      } else {
        result = await base44.entities.TeamMember.create(data);
      }
      // Sync role to User entity if email exists
      if (data.email && data.role) {
        try {
          await base44.functions.invoke('setUserRole', { email: data.email, role: data.role });
        } catch (e) {
          console.warn('Kunde inte synka roll till User:', e);
        }
      }
      return result;
    },
    onMutate: async (memberData) => {
      await queryClient.cancelQueries({ queryKey: ['teamMembers'] });
      const prevMembers = queryClient.getQueryData(['teamMembers']);
      const { send_invitation, send_new_invitation, ...data } = memberData;
      if (editMember?.id) {
        queryClient.setQueryData(['teamMembers'], (old) =>
          old?.map(m => m.id === editMember.id ? { ...m, ...data } : m) || []
        );
      } else {
        queryClient.setQueryData(['teamMembers'], (old) => [...(old || []), { ...data, id: 'temp-' + Date.now() }]);
      }
      return { prevMembers };
    },
    onError: (err, newData, context) => {
      if (context?.prevMembers) queryClient.setQueryData(['teamMembers'], context.prevMembers);
    },
    onSuccess: (_, memberData) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      const invited = (memberData.send_invitation || memberData.send_new_invitation) && memberData.email;
      toast({
        title: editMember ? 'Medlem uppdaterad' : 'Medlem tillagd',
        description: invited ? `Inbjudan skickad till ${memberData.email}` : undefined,
      });
      setEditMember(null);
      setShowAddMember(false);
    },
    onError: (error) => {
      toast({
        title: 'Något gick fel',
        description: error?.message || 'Kunde inte spara medlemmen',
        variant: 'destructive',
      });
    },
  });

  const handleSaveMember = (memberData) => saveMemberMutation.mutate(memberData);

  const handleDeleteMember = (member) => {
    setMemberToDelete(member);
  };

  const deleteMemberMutation = useMutation({
    mutationFn: async (data) => {
      if (data.unassign) {
        await base44.functions.invoke('unassignToolsFromEntity', { entityType: 'TeamMember', entityId: data.memberId });
      }
      return base44.entities.TeamMember.delete(data.memberId);
    },
    onMutate: async ({ memberId }) => {
      await queryClient.cancelQueries({ queryKey: ['teamMembers'] });
      const prevMembers = queryClient.getQueryData(['teamMembers']);
      queryClient.setQueryData(['teamMembers'], (old) =>
        old?.filter(m => m.id !== memberId) || []
      );
      return { prevMembers };
    },
    onError: (err, newData, context) => {
      if (context?.prevMembers) queryClient.setQueryData(['teamMembers'], context.prevMembers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setMemberToDelete(null);
    },
  });

  const confirmDeleteMember = (unassign) => {
    if (!memberToDelete) return;
    deleteMemberMutation.mutate({ memberId: memberToDelete.id, unassign });
  };

  const handleInactivateMember = (member) => {
    setMemberToInactivate(member);
  };

  const inactivateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('inactivateUser', { targetMemberId: data.targetMemberId, replacementMemberId: data.replacementMemberId }),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast({ title: 'Användare inaktiverad', description: res.data.message });
        queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
        queryClient.invalidateQueries({ queryKey: ['tools'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        setMemberToInactivate(null);
      } else {
        toast({ title: 'Fel', description: res.data?.error || 'Något gick fel', variant: 'destructive' });
      }
    },
  });

  const confirmInactivate = (targetMemberId, replacementMemberId) => {
    inactivateMutation.mutate({ targetMemberId, replacementMemberId });
  };

  if (loadingMembers) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Team</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {teamMembers.length} {teamMembers.length !== 1 ? 'teammedlemmar' : 'teammedlem'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddMember(true)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Lägg till medlem
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            Aktiva ({activeMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'inactive' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            Inaktiva ({inactiveMembers.length})
          </button>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Sök teammedlemmar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-200 w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MobileSelect
              value={roleFilter}
              onChange={(v) => setRoleFilter(typeof v === 'object' ? v.target.value : v)}
              options={[
                { value: 'all', label: 'Alla roller' },
                ...availableRoles.map(role => ({ value: role, label: roleConfig[role]?.label || role }))
              ]}
              placeholder="Välj roll"
            />
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ml-auto">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`h-9 w-9 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><Grid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`h-9 w-9 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><List className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Team */}
        {filteredMembers.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {teamMembers.length === 0 ? 'Inga teammedlemmar ännu' : 'Inga matchande medlemmar'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {teamMembers.length === 0 
                ? 'Lägg till teammedlemmar för att tilldela verktyg och spåra användning'
                : 'Prova ett annat sökord'}
            </p>
            {teamMembers.length === 0 && (
              <Button
                onClick={() => setShowAddMember(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till första medlemmen
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map((member) => {
              const role = roleConfig[member.role] || { label: member.role || 'Okänd', color: 'bg-gray-100 text-gray-700' };
              const toolCount = getToolCount(member.email);
              return (
                <div key={member.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Avatar className="w-14 h-14 border-2 border-gray-100">
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                        <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold text-lg">{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        {!member.is_active && <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inaktiv</Badge>}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem onClick={() => setEditMember(member)}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                           {member.is_active !== false && (
                             <DropdownMenuItem onClick={() => handleInactivateMember(member)} className="text-amber-600"><Trash2 className="w-4 h-4 mr-2" />Inaktivera</DropdownMenuItem>
                           )}
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => handleDeleteMember(member)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort permanent</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{member.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge className={`${role.color} border-0 text-xs`}>{role.label}</Badge>
                      {member.unit_name && (
                        <Badge className={`border-0 text-xs ${member.unit_name === 'Utemiljö' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {member.unit_name}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {member.email && <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Mail className="w-4 h-4" /><span className="truncate">{member.email}</span></div>}
                      {member.phone && <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Phone className="w-4 h-4" /><span>{member.phone}</span></div>}
                      {(() => {
                        const loc = locations.find(l => l.id === member.default_location_id);
                        const displayLoc = loc && !loc.parent_location_id ? loc.name : null;
                        return displayLoc ? <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><MapPin className="w-4 h-4" /><span className="truncate">{displayLoc}</span></div> : null;
                      })()}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Wrench className="w-4 h-4" /><span>Tilldelade verktyg</span></div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{toolCount}</span>
                      </div>
                      {(() => {
                        const userInfo = getUserInfo(member.email);
                        if (!userInfo) return (
                          <div className="flex items-center gap-2 text-xs text-gray-400"><LogIn className="w-3.5 h-3.5" /><span>Ej inloggad i appen</span></div>
                        );
                        return (
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Senast aktiv {formatDistanceToNow(new Date(userInfo.updated_date), { addSuffix: true, locale: sv })}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredMembers.map((member) => {
                const role = roleConfig[member.role] || { label: member.role || 'Okänd', color: 'bg-gray-100 text-gray-700' };
                const toolCount = getToolCount(member.email);
                return (
                  <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <Avatar className="w-10 h-10 border-2 border-gray-100 shrink-0">
                      <AvatarImage src={member.avatar_url} alt={member.name} />
                      <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold">{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
                        <Badge className={`${role.color} border-0 text-xs`}>{role.label}</Badge>
                        {member.unit_name && (
                          <Badge className={`border-0 text-xs ${member.unit_name === 'Utemiljö' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {member.unit_name}
                          </Badge>
                        )}
                        {!member.is_active && <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inaktiv</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      {(() => {
                        const loc = locations.find(l => l.id === member.default_location_id);
                        const displayLoc = loc && !loc.parent_location_id ? loc.name : null;
                        return displayLoc ? <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{displayLoc}</span> : null;
                      })()}
                      <span className="flex items-center gap-1"><Wrench className="w-4 h-4" />{toolCount}</span>
                      {(() => {
                        const userInfo = getUserInfo(member.email);
                        if (!userInfo) return <span className="flex items-center gap-1 text-gray-400"><LogIn className="w-4 h-4" />Ej inloggad</span>;
                        return (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(userInfo.updated_date), { addSuffix: true, locale: sv })}
                          </span>
                        );
                      })()}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setEditMember(member)}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                        {member.is_active !== false && (
                          <DropdownMenuItem onClick={() => handleInactivateMember(member)} className="text-amber-600"><Trash2 className="w-4 h-4 mr-2" />Inaktivera</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteMember(member)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort permanent</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <TeamMemberFormModal
        isOpen={showAddMember || !!editMember}
        onClose={() => {
          setShowAddMember(false);
          setEditMember(null);
        }}
        member={editMember}
        locations={activeUnitId ? locations.filter(l => l.unit_id === activeUnitId) : locations}
        onSubmit={handleSaveMember}
        isLoading={saveMemberMutation.isPending}
      />
      <InactivateUserDialog
        isOpen={!!memberToInactivate}
        onClose={() => setMemberToInactivate(null)}
        member={memberToInactivate}
        activeMembers={teamMembers}
        onConfirm={confirmInactivate}
        isLoading={inactivateMutation.isPending}
      />
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
      <DeleteConfirmationModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        title={`Ta bort ${memberToDelete?.name}?`}
        description={
          memberToDelete && getToolCount(memberToDelete.email) > 0
            ? `${memberToDelete.name} har ${getToolCount(memberToDelete.email)} verktyg tilldelade. Vad vill du göra med dessa?`
            : `Är du säker på att du vill ta bort ${memberToDelete?.name}? Åtgärden kan inte ångras.`
        }
        hasTools={memberToDelete ? getToolCount(memberToDelete.email) > 0 : false}
        onUnassignAndDelete={() => confirmDeleteMember(true)}
        onDeleteOnly={() => confirmDeleteMember(false)}
        onConfirmNoTools={() => confirmDeleteMember(false)}
      />
    </div>
  );
}