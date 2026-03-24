import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TeamMemberFormModal from '@/components/modals/TeamMemberFormModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const roleConfig = {
  technician: { label: 'Tekniker', color: 'bg-blue-100 text-blue-700' },
  supervisor: { label: 'Arbetsledare', color: 'bg-purple-100 text-purple-700' },
  manager: { label: 'Chef', color: 'bg-emerald-100 text-emerald-700' },
  apprentice: { label: 'Lärling', color: 'bg-amber-100 text-amber-700' },
  contractor: { label: 'Underleverantör', color: 'bg-gray-100 text-gray-700' },
};

export default function Team() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editMember, setEditMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

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

  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getToolCount = (memberEmail) => {
    return tools.filter(t => t.assigned_to_email === memberEmail).length;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSaveMember = async (memberData) => {
    setIsLoading(true);
    if (editMember?.id) {
      await base44.entities.TeamMember.update(editMember.id, memberData);
    } else {
      await base44.entities.TeamMember.create(memberData);
    }
    queryClient.invalidateQueries(['teamMembers']);
    setEditMember(null);
    setShowAddMember(false);
    setIsLoading(false);
  };

  const handleDeleteMember = async (member) => {
    const toolCount = getToolCount(member.email);
    if (toolCount > 0) {
      alert(`Kan inte ta bort "${member.name}" – de har ${toolCount} verktyg tilldelade. Tilldela om verktygen först.`);
      return;
    }
    if (window.confirm(`Är du säker på att du vill ta bort "${member.name}"?`)) {
      await base44.entities.TeamMember.delete(member.id);
      queryClient.invalidateQueries(['teamMembers']);
    }
  };

  if (loadingMembers) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team</h1>
            <p className="text-gray-500 mt-1">
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

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Sök teammedlemmar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200"
              />
            </div>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`h-11 w-11 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><Grid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`h-11 w-11 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><List className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Team */}
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {teamMembers.length === 0 ? 'Inga teammedlemmar ännu' : 'Inga matchande medlemmar'}
            </h3>
            <p className="text-gray-500 mb-4">
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
              const role = roleConfig[member.role] || roleConfig.technician;
              const toolCount = getToolCount(member.email);
              return (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
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
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setEditMember(member)}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteMember(member)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{member.name}</h3>
                    <Badge className={`${role.color} border-0 text-xs mt-1`}>{role.label}</Badge>
                    <div className="mt-4 space-y-2">
                      {member.email && <div className="flex items-center gap-2 text-sm text-gray-500"><Mail className="w-4 h-4" /><span className="truncate">{member.email}</span></div>}
                      {member.phone && <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="w-4 h-4" /><span>{member.phone}</span></div>}
                      {member.default_location_name && <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin className="w-4 h-4" /><span className="truncate">{member.default_location_name}</span></div>}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-500"><Wrench className="w-4 h-4" /><span>Tilldelade verktyg</span></div>
                        <span className="font-medium text-gray-900">{toolCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const role = roleConfig[member.role] || roleConfig.technician;
                const toolCount = getToolCount(member.email);
                return (
                  <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <Avatar className="w-10 h-10 border-2 border-gray-100 shrink-0">
                      <AvatarImage src={member.avatar_url} alt={member.name} />
                      <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold">{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <Badge className={`${role.color} border-0 text-xs`}>{role.label}</Badge>
                        {!member.is_active && <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inaktiv</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
                      {member.default_location_name && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{member.default_location_name}</span>}
                      <span className="flex items-center gap-1"><Wrench className="w-4 h-4" />{toolCount}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setEditMember(member)}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteMember(member)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort</DropdownMenuItem>
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
        locations={locations}
        onSubmit={handleSaveMember}
        isLoading={isLoading}
      />
    </div>
  );
}