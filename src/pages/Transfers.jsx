import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  ArrowRight,
  Loader2,
  Clock,
  MapPin,
  User,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Pencil,
  RotateCcw,
  Bell,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Mail,
} from 'lucide-react';
import AdminEditLoanDialog from '@/components/modals/AdminEditLoanDialog';
import { format, differenceInDays } from 'date-fns';

export default function Transfers() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loanStatusFilter, setLoanStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('transfer_date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Edit/return transfer dialog
  const [editTransfer, setEditTransfer] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Edit loan request dialog
  const [editLoan, setEditLoan] = useState(null);
  const [editLoanOpen, setEditLoanOpen] = useState(false);

  // Reminder
  const [sendingReminder, setSendingReminder] = useState(null);
  const [reminderSent, setReminderSent] = useState(null);

  const sendReminder = async (loanId) => {
    setSendingReminder(loanId);
    await base44.functions.invoke('sendLoanReminder', { loan_request_id: loanId });
    setSendingReminder(null);
    setReminderSent(loanId);
    setTimeout(() => setReminderSent(null), 3000);
  };
  const [editToLocationId, setEditToLocationId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExpectedReturn, setEditExpectedReturn] = useState('');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const [approvingLoan, setApprovingLoan] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  // Per-tool decisions: { [toolId]: 'approved' | 'rejected' | 'approved_custom_date' }
  const [toolDecisions, setToolDecisions] = useState({});
  // Per-tool custom dates: { [toolId]: 'YYYY-MM-DD' }
  const [toolCustomDates, setToolCustomDates] = useState({});
  const [approveComment, setApproveComment] = useState('');

  const openApproveDialog = (loan) => {
    setApprovingLoan(loan);
    // Initialize all tools as 'approved'
    const decisions = {};
    const dates = {};
    (loan.tool_ids || []).forEach((id) => {
      decisions[id] = 'approved';
      dates[id] = loan.default_return_date || '';
    });
    setToolDecisions(decisions);
    setToolCustomDates(dates);
    setApproveComment('');
    setApproveDialogOpen(true);
  };

  const handleApproveSubmit = () => {
    const approvedToolIds = Object.entries(toolDecisions)
      .filter(([, v]) => v === 'approved' || v === 'approved_custom_date')
      .map(([id]) => id);
    const rejectedToolIds = Object.entries(toolDecisions)
      .filter(([, v]) => v === 'rejected')
      .map(([id]) => id);

    const hasChanges = Object.values(toolDecisions).some(v => v === 'rejected' || v === 'approved_custom_date');
    if (hasChanges && !approveComment.trim()) {
      alert('Kommentar är obligatorisk när du nekar eller ändrar datum för maskiner.');
      return;
    }
    if (rejectedToolIds.length === 0 && approvedToolIds.length === 0) return;

    const allRejected = approvedToolIds.length === 0;

    // Build adjusted return date: if single date change, use it
    const customDateToolId = Object.entries(toolDecisions).find(([, v]) => v === 'approved_custom_date')?.[0];
    const adjustedReturnDate = customDateToolId ? toolCustomDates[customDateToolId] : undefined;

    approveMutation.mutate({
      loan_request_id: approvingLoan.id,
      approved: !allRejected,
      approver_comment: approveComment,
      approved_tool_ids: allRejected ? [] : approvedToolIds,
      adjusted_return_date: adjustedReturnDate,
    });
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => base44.entities.Transfer.list('-transfer_date', 200),
  });

  const { data: loanRequests = [], isLoading: isLoadingLoans } = useQuery({
    queryKey: ['loanRequests'],
    queryFn: () => base44.entities.LoanRequest.list('-created_date', 200),
  });

  const approveMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('approveLoanRequest', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setApproveDialogOpen(false);
      setApprovingLoan(null);
      setApproveComment('');
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const updateTransferMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transfer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setEditDialogOpen(false);
      setEditTransfer(null);
    }
  });

  const returnTransferMutation = useMutation({
    mutationFn: async (transfer) => {
      // Mark as returned and move tool back to original location
      await base44.entities.Transfer.update(transfer.id, {
        status: 'returned',
        returned_date: new Date().toISOString(),
      });
      if (transfer.from_location_id && transfer.tool_id) {
        await base44.entities.Tool.update(transfer.tool_id, {
          location_id: transfer.from_location_id,
          location_name: transfer.from_location_name,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setEditDialogOpen(false);
      setEditTransfer(null);
    }
  });

  const openEditDialog = (transfer) => {
    setEditTransfer(transfer);
    setEditToLocationId(transfer.to_location_id || '');
    setEditNotes(transfer.notes || '');
    setEditExpectedReturn(transfer.expected_return_date ? transfer.expected_return_date.split('T')[0] : '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    const toLocation = locations.find(l => l.id === editToLocationId);
    updateTransferMutation.mutate({
      id: editTransfer.id,
      data: {
        to_location_id: editToLocationId,
        to_location_name: toLocation?.name || editTransfer.to_location_name,
        notes: editNotes,
        expected_return_date: editExpectedReturn || null,
      }
    });
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = !searchQuery ||
      transfer.tool_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.from_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.to_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.to_person_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDirection === 'desc' ? -cmp : cmp;
  });

  const pendingForMe = loanRequests.filter(loan =>
    loan.status === 'pending' && currentUser &&
    (loan.approver_email === currentUser.email || currentUser.role === 'admin' || currentUser.role === 'ägare')
  );

  const filteredLoans = loanRequests.filter(loan => {
    const matchesSearch = !searchQuery ||
      loan.tool_names?.some(name => name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      loan.destination_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = loanStatusFilter === 'all' || loan.status === loanStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading || isLoadingLoans) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  const loanStatusConfig = {
    pending: { label: 'Väntar på godkännande', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Godkänd', color: 'bg-blue-100 text-blue-700' },
    rejected: { label: 'Avslagen', color: 'bg-red-100 text-red-700' },
    pending_return: { label: 'Väntar mottagning', color: 'bg-orange-100 text-orange-700' },
    returned: { label: 'Återlämnad', color: 'bg-green-100 text-green-700' }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lån av utrustning</h1>
          <p className="text-gray-500 mt-1">{transfers.length + loanRequests.length} lån totalt</p>
        </div>

        {/* Pending action banner */}
        {pendingForMe.length > 0 ? (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                {pendingForMe.length === 1
                  ? '1 förfrågan väntar på ditt svar'
                  : `${pendingForMe.length} förfrågningar väntar på ditt svar`}
              </p>
              <p className="text-sm text-amber-700">Gå till fliken "Låneförfrågningar" och hantera dem.</p>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Inga väntande förfrågningar</p>
              <p className="text-sm text-green-700">Du har inga förfrågningar att hantera just nu.</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Sök på utrustning, plats eller person..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-200"
            />
          </div>
        </div>

        <Tabs defaultValue="loans">
          <TabsList>
            <TabsTrigger value="loans" className="flex items-center gap-2">
              Låneförfrågningar ({filteredLoans.length})
              {pendingForMe.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingForMe.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="transfers">
              Direktförflyttningar ({filteredTransfers.length})
            </TabsTrigger>
          </TabsList>

          {/* Direktförflyttningar */}
          <TabsContent value="transfers" className="mt-4 space-y-4">
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="active">Aktivt lån</SelectItem>
                  <SelectItem value="returned">Återlämnad</SelectItem>
                  <SelectItem value="overdue">Försenad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredTransfers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <ArrowRightLeft className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Inga direktförflyttningar hittades</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('transfer_date')}>Datum {sortField === 'transfer_date' && (sortDirection === 'desc' ? '↓' : '↑')}</TableHead>
                        <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tool_name')}>Utrustning {sortField === 'tool_name' && (sortDirection === 'desc' ? '↓' : '↑')}</TableHead>
                        <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('from_location_name')}>Från {sortField === 'from_location_name' && (sortDirection === 'desc' ? '↓' : '↑')}</TableHead>
                        <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('to_location_name')}>Till {sortField === 'to_location_name' && (sortDirection === 'desc' ? '↓' : '↑')}</TableHead>
                        <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('expected_return_date')}>Återlämning {sortField === 'expected_return_date' && (sortDirection === 'desc' ? '↓' : '↑')}</TableHead>
                        <TableHead className="font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>Status {sortField === 'status' && (sortDirection === 'desc' ? '↓' : '↑')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((transfer) => {
                        const isOverdue = transfer.expected_return_date && transfer.status === 'active' && new Date(transfer.expected_return_date) < new Date();
                        const daysUntilReturn = transfer.expected_return_date && transfer.status === 'active' ? differenceInDays(new Date(transfer.expected_return_date), new Date()) : null;
                        return (
                          <TableRow key={transfer.id} className="hover:bg-gray-50">
                            <TableCell>
                              <p className="font-medium text-gray-900">{transfer.transfer_date && format(new Date(transfer.transfer_date), 'd MMM yyyy')}</p>
                              <p className="text-xs text-gray-500">{transfer.transfer_date && format(new Date(transfer.transfer_date), 'HH:mm')}</p>
                            </TableCell>
                            <TableCell><p className="font-medium text-gray-900">{transfer.tool_name}</p></TableCell>
                            <TableCell><span className="text-gray-600">{transfer.from_location_name || '—'}</span></TableCell>
                            <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-0">{transfer.to_location_name || '—'}</Badge></TableCell>
                            <TableCell>
                              {transfer.expected_return_date ? (
                                <div>
                                  <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{format(new Date(transfer.expected_return_date), 'd MMM yyyy')}</p>
                                  {transfer.status === 'active' && daysUntilReturn !== null && (
                                    <p className={`text-xs ${isOverdue ? 'text-red-600' : daysUntilReturn <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                                      {isOverdue ? `${Math.abs(daysUntilReturn)} dagar försenad` : `${daysUntilReturn} dagar kvar`}
                                    </p>
                                  )}
                                </div>
                              ) : <span className="text-gray-400">—</span>}
                            </TableCell>
                            <TableCell>
                              {transfer.status === 'returned'
                                ? <Badge className="bg-gray-100 text-gray-700 border-0">Återlämnad</Badge>
                                : isOverdue
                                ? <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" />Försenad</Badge>
                                : transfer.status === 'active'
                                ? <Badge className="bg-blue-100 text-blue-700 border-0">Aktivt lån</Badge>
                                : <span className="text-gray-400">—</span>}
                            </TableCell>
                            <TableCell>
                              {transfer.status !== 'returned' && (
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(transfer)} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                                  <Pencil className="w-3.5 h-3.5" />
                                  Redigera
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Låneförfrågningar */}
          <TabsContent value="loans" className="mt-4 space-y-4">
            <div className="flex gap-3">
              <Select value={loanStatusFilter} onValueChange={setLoanStatusFilter}>
                <SelectTrigger className="w-[200px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="pending">Väntar på godkännande</SelectItem>
                  <SelectItem value="approved">Godkänd</SelectItem>
                  <SelectItem value="pending_return">Väntar mottagning</SelectItem>
                  <SelectItem value="returned">Återlämnad</SelectItem>
                  <SelectItem value="rejected">Avslagen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredLoans.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <ArrowRightLeft className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Inga låneförfrågningar hittades</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLoans.map((loan) => {
                  const config = loanStatusConfig[loan.status] || { label: loan.status, color: 'bg-gray-100 text-gray-700' };
                  const needsMyAction = loan.status === 'pending' && currentUser && (loan.approver_email === currentUser.email || currentUser.role === 'admin' || currentUser.role === 'ägare');
                  return (
                    <div key={loan.id} className={`bg-white rounded-2xl shadow-sm p-5 space-y-4 ${needsMyAction ? 'border-2 border-red-400 bg-red-50' : 'border border-gray-100'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-1">Utrustning</p>
                          <div className="flex flex-wrap gap-1">
                            {loan.tool_names?.slice(0, 2).map((name, i) => (
                              <Badge key={i} variant="secondary">{name}</Badge>
                            ))}
                            {loan.tool_names?.length > 2 && (
                              <Badge variant="secondary">+{loan.tool_names.length - 2}</Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={`${config.color} border-0`}>{config.label}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{loan.requested_by_name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Från:</span>
                          <span>{loan.tool_details?.[0]?.location_name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          <span className="text-gray-500">Till:</span>
                          <span>{loan.destination_location_name || '—'}</span>
                        </div>
                        {loan.default_return_date && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Återlämning: {format(new Date(loan.default_return_date), 'd MMM yyyy')}</span>
                          </div>
                        )}
                      </div>
                      {/* Mailmottagare */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Mail className="w-3 h-3" /> Mailas om statusuppdateringar</p>
                        <div className="flex flex-col gap-1">
                          {loan.requested_by_email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-medium">Låntagare</span>
                              <span>{loan.requested_by_name || loan.requested_by_email}</span>
                            </div>
                          )}
                          {loan.approver_email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium">Godkännare (källplats)</span>
                              <span>{loan.approver_name || loan.approver_email}</span>
                            </div>
                          )}
                          {loan.destination_location_manager_email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-medium">Ansvarig för mottagarplats</span>
                              <span>{loan.destination_location_manager_name || loan.destination_location_manager_email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {loan.approver_comment && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Godkännarkommentar</p>
                          <p className="text-sm text-gray-700">{loan.approver_comment}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                        {/* Godkänn/Neka för pending lån där användaren är godkännare */}
                        {loan.status === 'pending' && currentUser && (loan.approver_email === currentUser.email || currentUser.role === 'admin' || currentUser.role === 'ägare') && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
                            onClick={() => openApproveDialog(loan)}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Hantera förfrågan
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setEditLoan(loan); setEditLoanOpen(true); }} className="flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          Redigera
                        </Button>
                        {loan.status !== 'returned' && loan.status !== 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sendingReminder === loan.id || reminderSent === loan.id}
                            onClick={() => sendReminder(loan.id)}
                            className={`flex items-center gap-1.5 transition-colors ${
                              reminderSent === loan.id
                                ? 'text-green-700 border-green-300 bg-green-50'
                                : 'text-amber-700 border-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            {sendingReminder === loan.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : reminderSent === loan.id
                              ? <CheckCircle2 className="w-3.5 h-3.5" />
                              : <Bell className="w-3.5 h-3.5" />}
                            {reminderSent === loan.id ? 'Påminnelse skickad!' : 'Skicka påminnelse'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve/Reject Dialog – per tool */}
      {approvingLoan && (
        <Dialog open={approveDialogOpen} onOpenChange={(v) => { setApproveDialogOpen(v); if (!v) { setApprovingLoan(null); setApproveComment(''); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hantera låneförfrågan</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Info */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p className="text-gray-600">Begärd av: <strong>{approvingLoan.requested_by_name}</strong></p>
                <p className="text-gray-600">Destination: <strong>{approvingLoan.destination_location_name}</strong></p>
                {approvingLoan.requester_comment && (
                  <p className="text-gray-600 pt-1 border-t border-gray-200 mt-1">Anteckning: <em>{approvingLoan.requester_comment}</em></p>
                )}
              </div>

              {/* Per-tool decisions */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Maskiner i förfrågan</Label>
                {(approvingLoan.tool_ids || []).map((toolId, idx) => {
                  const toolName = approvingLoan.tool_names?.[idx] || toolId;
                  const toolDetail = approvingLoan.tool_details?.find(t => t.tool_id === toolId);
                  const returnDate = toolDetail?.return_date || approvingLoan.default_return_date;
                  const decision = toolDecisions[toolId] || 'approved';
                  return (
                    <div key={toolId} className={`border rounded-lg p-3 space-y-2 ${decision === 'rejected' ? 'border-red-200 bg-red-50' : decision === 'approved_custom_date' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{toolName}</p>
                        {returnDate && (
                          <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(returnDate), 'd MMM yyyy')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setToolDecisions(prev => ({ ...prev, [toolId]: 'approved' }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${decision === 'approved' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                        >
                          Godkänn
                        </button>
                        <button
                          onClick={() => setToolDecisions(prev => ({ ...prev, [toolId]: 'approved_custom_date' }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${decision === 'approved_custom_date' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'}`}
                        >
                          Godkänn med annat datum
                        </button>
                        <button
                          onClick={() => setToolDecisions(prev => ({ ...prev, [toolId]: 'rejected' }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${decision === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                        >
                          Neka
                        </button>
                      </div>
                      {decision === 'approved_custom_date' && (
                        <div>
                          <Label className="text-xs mb-1 block">Nytt återlämningsdatum</Label>
                          <Input
                            type="date"
                            value={toolCustomDates[toolId] || ''}
                            onChange={(e) => setToolCustomDates(prev => ({ ...prev, [toolId]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Comment */}
              <div>
                <Label className="mb-1 block">
                  Kommentar
                  {Object.values(toolDecisions).some(v => v === 'rejected' || v === 'approved_custom_date') && (
                    <span className="text-red-500 ml-1">* (obligatorisk vid nekande/datumändring)</span>
                  )}
                </Label>
                <Textarea
                  placeholder="Lägg till kommentar..."
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => { setApproveDialogOpen(false); setApprovingLoan(null); }}>Avbryt</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={approveMutation.isPending}
                onClick={handleApproveSubmit}
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                Bekräfta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AdminEditLoanDialog
        request={editLoan}
        open={editLoanOpen}
        onOpenChange={(v) => { setEditLoanOpen(v); if (!v) setEditLoan(null); }}
      />

      {/* Edit/Return Transfer Dialog */}
      {editTransfer && (
        <Dialog open={editDialogOpen} onOpenChange={(v) => { setEditDialogOpen(v); if (!v) setEditTransfer(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Redigera förflyttning – {editTransfer.tool_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 text-sm bg-gray-50 rounded-xl p-3">
                <span className="text-gray-500">{editTransfer.from_location_name || '—'}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-medium text-gray-900">{editTransfer.to_location_name || '—'}</span>
              </div>

              <div className="space-y-2">
                <Label>Flytta till plats</Label>
                <Select value={editToLocationId} onValueChange={setEditToLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj ny plats" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.is_active !== false).map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Förväntat återlämningsdatum</Label>
                <Input
                  type="date"
                  value={editExpectedReturn}
                  onChange={(e) => setEditExpectedReturn(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Anteckningar</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="Valfri kommentar..."
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                className="text-green-700 border-green-200 hover:bg-green-50 w-full sm:w-auto"
                disabled={returnTransferMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Markera "${editTransfer.tool_name}" som återlämnad och flytta tillbaka till ${editTransfer.from_location_name}?`)) {
                    returnTransferMutation.mutate(editTransfer);
                  }
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Flytta tillbaka
              </Button>
              <Button
                className="bg-[#8B1E1E] hover:bg-[#6B1515] w-full sm:w-auto"
                disabled={updateTransferMutation.isPending}
                onClick={handleSaveEdit}
              >
                {updateTransferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Spara ändringar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}