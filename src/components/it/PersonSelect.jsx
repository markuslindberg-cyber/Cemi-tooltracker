import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PersonSelect({ value, onChange, allowNone }) {
  const { data: people = [] } = useQuery({ queryKey: ['teamMembers-it'], queryFn: () => base44.entities.TeamMember.list('name', 1000) });
  return (
    <Select value={value || 'none'} onValueChange={v => onChange(v === 'none' ? null : people.find(p => p.id === v))}>
      <SelectTrigger><SelectValue placeholder="Välj person" /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">Ingen (i lager)</SelectItem>}
        {!allowNone && <SelectItem value="none" disabled>Välj person</SelectItem>}
        {people.filter(p => p.is_active !== false).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}