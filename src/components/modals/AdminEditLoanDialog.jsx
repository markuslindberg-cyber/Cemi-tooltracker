import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function AdminEditLoanDialog({ request, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const [returnDate, setReturnDate] = useState('');
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [destinationLocationName, setDestinationLocationName] = useState('');
  const [approverComment, setApproverComment] = useState('');

  useEffect(() => {
    if (request) {
      setReturnDate(request.default_return_date?.split('T')[0] || '');
      setAssignedToEmail(request.assigned_to_email || '');
      setAssignedToName(request.assigned_to_name || '');
      setDestinationLocationId(request.destination_location_id || '');
      setDestinationLocationName(request.destination_location_name || '');
      setApproverComment(request.approver_comment || '');
    }
  }, [request]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.filter({ is_active: true }),
    enabled: open
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ is_active: true }),
    enabled: open
  });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.LoanRequest.update(request.id, {
      default_return_date: returnDate,
      assigned_to_email: assignedToEmail,
      assigned_to_name: assignedToName,
      destination_location_id: destinationLocationId,
      destination_location_name: destinationLocationName,
      approver_comment: approverComment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      onOpenChange(false);
    }
  });

  const handleLocationChange = (e) => {
    const loc = locations.find(l => l.id === e.target.value);
    setDestinationLocationId(loc?.id || '');
    setDestinationLocationName(loc?.name || '');
  };

  const handlePersonChange = (e) => {
    const member = teamMembers.find(m => m.email === e.target.value);
    setAssignedToEmail(member?.email || '');
    setAssignedToName(member?.name || '');
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redigera lån</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-900 text-sm">{request.tool_names?.join(', ')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Begärd av: {request.requested_by_name}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Låntagare</label>
            <select
              value={assignedToEmail}
              onChange={handlePersonChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Välj person</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.email}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Destinationsplats</label>
            <select
              value={destinationLocationId}
              onChange={handleLocationChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Välj plats</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Återlämningsdatum</label>
            <input
              type="date"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Kommentar</label>
            <Textarea
              placeholder="Anteckning om lånet..."
              value={approverComment}
              onChange={e => setApproverComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !returnDate}
          >
            {saveMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}