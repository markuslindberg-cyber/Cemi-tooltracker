import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Calendar, Barcode } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

export default function LoanRequestModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [selectedTools, setSelectedTools] = useState([]);
  const [defaultReturnDate, setDefaultReturnDate] = useState('');
  const [assignedTo, setAssignedTo] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [comment, setComment] = useState('');
  const [useIndividualDates, setUseIndividualDates] = useState(false);
  const [individualDates, setIndividualDates] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  const { data: tools } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
    initialData: []
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    initialData: []
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    initialData: []
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const createLoanMutation = useMutation({
    mutationFn: async () => {
      const toolDetails = selectedTools.map(tool => ({
        tool_id: tool.id,
        tool_name: tool.name,
        location_id: tool.location_id,
        location_name: tool.location_name,
        return_date: useIndividualDates && individualDates[tool.id] ? individualDates[tool.id] : defaultReturnDate
      }));

      // Get approver (person responsible for source location)
      const sourceLoc = selectedTools[0] ? locations.find(l => l.id === selectedTools[0].location_id) : null;
      const approverEmail = sourceLoc?.team_member_ids?.[0] ? 
        teamMembers.find(tm => tm.id === sourceLoc.team_member_ids[0])?.email : null;

      // Get destination location manager
      const destLocManager = destinationLocation?.team_member_ids?.[0] ? 
        teamMembers.find(tm => tm.id === destinationLocation.team_member_ids[0]) : null;

      return base44.functions.invoke('createLoanRequest', {
        tool_ids: selectedTools.map(t => t.id),
        tool_names: selectedTools.map(t => t.name),
        tool_details: toolDetails,
        assigned_to_email: assignedTo.email,
        assigned_to_name: assignedTo.full_name,
        destination_location_id: destinationLocation.id,
        destination_location_name: destinationLocation.name,
        default_return_date: defaultReturnDate,
        requester_comment: comment,
        approver_email: approverEmail,
        approver_name: sourceLoc?.team_member_ids?.[0] ? teamMembers.find(tm => tm.id === sourceLoc.team_member_ids[0])?.name : '',
        destination_location_manager_email: destLocManager?.email,
        destination_location_manager_name: destLocManager?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setSelectedTools([]);
      setDefaultReturnDate('');
      setAssignedTo(null);
      setDestinationLocation(null);
      setComment('');
      setUseIndividualDates(false);
      setIndividualDates({});
      onClose();
    }
  });

  const handleAddTool = (tool) => {
    if (!selectedTools.find(t => t.id === tool.id)) {
      setSelectedTools([...selectedTools, tool]);
    }
    setSearchOpen(false);
  };

  const handleRemoveTool = (toolId) => {
    setSelectedTools(selectedTools.filter(t => t.id !== toolId));
    const newIndividualDates = { ...individualDates };
    delete newIndividualDates[toolId];
    setIndividualDates(newIndividualDates);
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const scannedTool = tools.find(t => t.barcode === barcodeInput);
    if (scannedTool) {
      handleAddTool(scannedTool);
      setBarcodeInput('');
    } else {
      alert(`Ingen maskin hittad med streckkod: ${barcodeInput}`);
      setBarcodeInput('');
    }
  };

  const handleSubmit = () => {
    if (!selectedTools.length || !defaultReturnDate || !assignedTo || !destinationLocation) {
      alert('Vänligen fyll i alla obligatoriska fält');
      return;
    }
    createLoanMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skicka förfrågan om lån av maskin</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tool Selection */}
          <div>
            <Label className="block mb-2">Maskiner *</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till maskin
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Sök maskin..." />
                      <CommandList>
                        <CommandEmpty>Ingen maskin hittad</CommandEmpty>
                        <CommandGroup>
                          {tools.map(tool => (
                            <CommandItem key={tool.id} onSelect={() => handleAddTool(tool)}>
                              <div className="flex-1">
                                <div className="font-medium">{tool.name}</div>
                                <div className="text-xs text-gray-500">{tool.location_name}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button 
                  variant={scanMode ? "default" : "outline"} 
                  size="icon"
                  onClick={() => setScanMode(!scanMode)}
                  title="Skanna streckkod"
                >
                  <Barcode className="w-4 h-4" />
                </Button>
              </div>

              {scanMode && (
                <form onSubmit={handleBarcodeScan} className="space-y-2">
                  <Input
                    placeholder="Skanna streckkod här..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">Streckkoden läses in automatiskt när du skannar</p>
                </form>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTools.map(tool => (
                <Badge key={tool.id} variant="secondary" className="flex items-center gap-1">
                  {tool.name}
                  <button onClick={() => handleRemoveTool(tool.id)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <Label className="block mb-2">Vem ska låna *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {assignedTo ? assignedTo.name : 'Välj person'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Sök person..." />
                  <CommandList>
                    <CommandEmpty>Ingen person hittad</CommandEmpty>
                    <CommandGroup>
                      {teamMembers.map(member => (
                        <CommandItem key={member.id} onSelect={() => setAssignedTo(member)}>
                          {member.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Destination Location */}
          <div>
            <Label className="block mb-2">Destination (plats där maskinen lånas till) *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {destinationLocation ? destinationLocation.name : 'Välj plats'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Sök plats..." />
                  <CommandList>
                    <CommandEmpty>Ingen plats hittad</CommandEmpty>
                    <CommandGroup>
                      {locations.map(loc => (
                        <CommandItem key={loc.id} onSelect={() => setDestinationLocation(loc)}>
                          {loc.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Return Date Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Använd samma återlämningsdatum för alla</Label>
              <Switch checked={!useIndividualDates} onCheckedChange={(v) => setUseIndividualDates(!v)} />
            </div>

            {!useIndividualDates && (
              <div>
                <Label className="block mb-2">Återlämningsdatum *</Label>
                <Input
                  type="date"
                  value={defaultReturnDate}
                  onChange={(e) => setDefaultReturnDate(e.target.value)}
                  required
                />
              </div>
            )}

            {useIndividualDates && selectedTools.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4">
                <p className="text-sm font-medium">Individuella återlämningsdatum per maskin:</p>
                {selectedTools.map(tool => (
                  <div key={tool.id}>
                    <Label className="text-sm">{tool.name}</Label>
                    <Input
                      type="date"
                      value={individualDates[tool.id] || ''}
                      onChange={(e) => setIndividualDates({ ...individualDates, [tool.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment */}
          <div>
            <Label className="block mb-2">Kommentar/Anteckning</Label>
            <Textarea
              placeholder="Lägg till eventuell anteckning..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={createLoanMutation.isPending}>
            {createLoanMutation.isPending ? 'Skickar...' : 'Skicka förfrågan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}