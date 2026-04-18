import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, RotateCw, AlertCircle, Pencil } from 'lucide-react';
import LoanRequestModal from '@/components/modals/LoanRequestModal';
import EditLoanDialog from '@/components/modals/EditLoanDialog';

export default function LoanRequests() {
  const queryClient = useQueryClient();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approverComment, setApproverComment] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [extensionComment, setExtensionComment] = useState('');
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [editLoanOpen, setEditLoanOpen] = useState(false);
  const [editLoanRequest, setEditLoanRequest] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: loanRequests = [] } = useQuery({
    queryKey: ['loanRequests'],
    queryFn: () => base44.entities.LoanRequest.list(),
    refetchInterval: 5000
  });

  const approveMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('approveLoanRequest', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setApproveDialogOpen(false);
      setApproverComment('');
      setSelectedRequest(null);
    }
  });

  const returnMutation = useMutation({
    mutationFn: (loan_request_id) => base44.functions.invoke('returnLoanedTools', { loan_request_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setSelectedRequest(null);
    }
  });

  const extendMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('extendLoanRequest', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setExtensionDialogOpen(false);
      setExtensionComment('');
      setExtensionDate('');
      setSelectedRequest(null);
    }
  });

  const updateReturnDateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateLoanReturnDate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
    }
  });

  if (!user) return null;

  // Filter requests based on user role
  const myRequests = loanRequests.filter(r => r.requested_by_email === user.email);
  const requestsToApprove = loanRequests.filter(r => r.approver_email === user.email && r.status === 'pending');
  const myLoans = loanRequests.filter(r => r.assigned_to_email === user.email && r.status === 'approved');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'returned': return <CheckCircle className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      approved: { label: 'Godkänd', variant: 'default' },
      rejected: { label: 'Nekad', variant: 'destructive' },
      pending: { label: 'Väntar', variant: 'secondary' },
      returned: { label: 'Returnerad', variant: 'outline' }
    };
    return variants[status] || { label: status, variant: 'secondary' };
  };

  const handleApprove = (approved) => {
    approveMutation.mutate({
      loan_request_id: selectedRequest.id,
      approved,
      approver_comment: approverComment
    });
  };

  const handleExtend = () => {
    if (!extensionDate) {
      alert('Vänligen ange ett nytt återlämningsdatum');
      return;
    }
    extendMutation.mutate({
      original_request_id: selectedRequest.id,
      new_return_date: extensionDate,
      extension_comment: extensionComment
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Förflyttningar</h1>
          <p className="text-gray-600 mt-1">Hantera låneförfrågningar för maskiner</p>
        </div>
        <Button onClick={() => setIsLoanModalOpen(true)} className="bg-[#8B1E1E] hover:bg-[#6B1616] w-full sm:w-auto">
          Skicka förfrågan om lån
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Väntande förfrågningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsToApprove.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Utlånade maskiner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myLoans.reduce((sum, r) => sum + r.tool_ids.length, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Lånade från andra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loanRequests.filter(r => r.destination_location_manager_email === user.email && r.status === 'approved').reduce((sum, r) => sum + r.tool_ids.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Väntande godkännande ({requestsToApprove.length})</TabsTrigger>
          <TabsTrigger value="mine">Mina förfrågningar ({myRequests.length})</TabsTrigger>
          <TabsTrigger value="loans">Mina lån ({myLoans.length})</TabsTrigger>
        </TabsList>

        {/* Requests to Approve */}
        <TabsContent value="pending" className="space-y-3">
          {requestsToApprove.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Inga väntande förfrågningar
              </CardContent>
            </Card>
          ) : (
            requestsToApprove.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedRequest(request); setApproveDialogOpen(true); }}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600">Begärd av: {request.requested_by_name}</p>
                        <p className="text-sm text-gray-600">Ska lånas av: {request.assigned_to_name}</p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Väntande</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Destination: {request.destination_location_name} | Återlämning: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                    </div>
                    {request.requester_comment && (
                      <div className="text-sm bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                        <p className="font-medium text-gray-700">Kommentar:</p>
                        <p className="text-gray-600">{request.requester_comment}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Requests */}
        <TabsContent value="mine" className="space-y-3">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Du har inte skickat några förfrågningar ännu
              </CardContent>
            </Card>
          ) : (
            myRequests.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600">Ska lånas av: {request.assigned_to_name}</p>
                        <p className="text-sm text-gray-600">Destination: {request.destination_location_name}</p>
                      </div>
                      <Badge variant={getStatusBadge(request.status).variant}>
                        {getStatusBadge(request.status).label}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Återlämningsdatum: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                    </div>
                    {request.approver_comment && (
                      <div className="text-sm bg-gray-50 p-2 rounded border-l-2 border-blue-300">
                        <p className="font-medium text-gray-700">Kommentar från godkännare:</p>
                        <p className="text-gray-600">{request.approver_comment}</p>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <Button variant="outline" size="sm" onClick={() => { setEditLoanRequest(request); setEditLoanOpen(true); }}>
                        <Pencil className="w-3 h-3 mr-1" />
                        Redigera lån
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Loans */}
        <TabsContent value="loans" className="space-y-3">
          {myLoans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Du har inga aktiva lån
              </CardContent>
            </Card>
          ) : (
            myLoans.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600">Från: {request.tool_details[0]?.location_name}</p>
                        <p className="text-sm text-gray-600">Till: {request.destination_location_name}</p>
                      </div>
                      <Badge variant="default">Godkänd</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Återlämningsdatum: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setEditLoanRequest(request); setEditLoanOpen(true); }}>
                        <Pencil className="w-3 h-3 mr-1" />
                        Redigera lån
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => returnMutation.mutate(request.id)}>
                        Markera som returnerad
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approve/Reject Dialog */}
      {selectedRequest && (
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hantera låneförfrågan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900">Maskiner: {selectedRequest.tool_names.join(', ')}</p>
                <p className="text-sm text-gray-600 mt-1">Begärd av: {selectedRequest.requested_by_name}</p>
                <p className="text-sm text-gray-600">Ska lånas av: {selectedRequest.assigned_to_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Din kommentar</label>
                <Textarea
                  placeholder="Lägg till eventuell kommentar..."
                  value={approverComment}
                  onChange={(e) => setApproverComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" onClick={() => handleApprove(false)} disabled={approveMutation.isPending}>
                Neka
              </Button>
              <Button onClick={() => handleApprove(true)} disabled={approveMutation.isPending}>
                Godkänn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Extension Dialog */}
      {selectedRequest && (
        <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Begär förlängning</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900">Maskiner: {selectedRequest.tool_names.join(', ')}</p>
                <p className="text-sm text-gray-600 mt-1">Nuvarande återlämningsdatum: {new Date(selectedRequest.default_return_date).toLocaleDateString('sv-SE')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nytt återlämningsdatum *</label>
                <input
                  type="date"
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kommentar</label>
                <Textarea
                  placeholder="Förklara varför förlängning behövs..."
                  value={extensionComment}
                  onChange={(e) => setExtensionComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtensionDialogOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleExtend} disabled={extendMutation.isPending}>
                Skicka förlängningsbegäran
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <EditLoanDialog
        request={editLoanRequest}
        open={editLoanOpen}
        onOpenChange={(v) => { setEditLoanOpen(v); if (!v) setEditLoanRequest(null); }}
        onEarlyReturn={(data) => updateReturnDateMutation.mutate(data)}
        onExtend={(data) => extendMutation.mutate(data)}
        isLoading={updateReturnDateMutation.isPending || extendMutation.isPending}
      />

      <LoanRequestModal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} />
    </div>
  );
}