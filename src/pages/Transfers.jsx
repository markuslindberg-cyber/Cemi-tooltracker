import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Search,
  ArrowRight,
  Loader2,
  Clock,
  MapPin,
  User,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Grid,
  List,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Transfers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [loanStatusFilter, setLoanStatusFilter] = useState('all');

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => base44.entities.Transfer.list('-transfer_date', 200),
  });

  const { data: loanRequests = [], isLoading: isLoadingLoans } = useQuery({
    queryKey: ['loanRequests'],
    queryFn: () => base44.entities.LoanRequest.list('-created_date', 200),
  });

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = !searchQuery ||
      transfer.tool_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.from_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.to_location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.to_person_name?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateFilter !== 'all' && transfer.transfer_date) {
      const transferDate = new Date(transfer.transfer_date);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = format(transferDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = transferDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = transferDate >= monthAgo;
      }
    }

    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

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

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lån av utrustning</h1>
          <p className="text-gray-500 mt-1">
            {transfers.length + loanRequests.length} lån totalt
          </p>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Sök på utrustning, plats eller person..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 border-gray-200" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-11"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="active">Aktivt lån</SelectItem>
                <SelectItem value="pending">Väntar på godkännande</SelectItem>
                <SelectItem value="approved">Godkänt</SelectItem>
                <SelectItem value="returned">Återlämnat</SelectItem>
                <SelectItem value="overdue">Försenat</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`h-11 w-11 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><List className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`h-11 w-11 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><Grid className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Combined Loans List */}
        {filteredTransfers.length === 0 && filteredLoans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ArrowRightLeft className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {transfers.length + loanRequests.length === 0 ? 'Inga lån ännu' : 'Inga matchande lån'}
            </h3>
            <p className="text-gray-500">
              {transfers.length + loanRequests.length === 0 
                ? 'Lån visas här när utrustning lånas ut'
                : 'Försök justera din sökning eller statusfilter'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {/* Transfers */}
            {filteredTransfers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Direktförflyttningar</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Datum</TableHead>
                      <TableHead className="font-semibold">Utrustning</TableHead>
                      <TableHead className="font-semibold">Från</TableHead>
                      <TableHead className="font-semibold">Till</TableHead>
                      <TableHead className="font-semibold">Tilldelad</TableHead>
                      <TableHead className="font-semibold">Återlämning</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
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
                          <TableCell>{transfer.to_person_name ? <span className="text-gray-600">{transfer.to_person_name}</span> : <span className="text-gray-400">—</span>}</TableCell>
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
                            {transfer.status === 'returned' ? <Badge className="bg-gray-100 text-gray-700 border-0">Återlämnad</Badge>
                              : isOverdue ? <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" />Försenad</Badge>
                              : transfer.status === 'active' ? <Badge className="bg-blue-100 text-blue-700 border-0">Aktivt lån</Badge>
                              : <span className="text-gray-400">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Loan Requests */}
            {filteredLoans.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-gray-50 rounded-t-2xl border border-gray-100">
                  <h3 className="font-semibold text-gray-900">Låneförfrågningar</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {filteredLoans.map((loan) => {
                    const statusConfig = {
                      pending: { label: 'Väntar på godkännande', color: 'bg-amber-100 text-amber-700' },
                      approved: { label: 'Godkänd', color: 'bg-blue-100 text-blue-700' },
                      rejected: { label: 'Avslad', color: 'bg-red-100 text-red-700' },
                      returned: { label: 'Återlämnad', color: 'bg-green-100 text-green-700' }
                    };
                    const config = statusConfig[loan.status] || { label: loan.status, color: 'bg-gray-100 text-gray-700' };
                    
                    return (
                      <div key={loan.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
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
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{loan.requested_by_name || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{loan.destination_location_name || '—'}</span>
                          </div>
                          {loan.default_return_date && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Återlämning: {format(new Date(loan.default_return_date), 'd MMM yyyy')}</span>
                            </div>
                          )}
                        </div>

                        {loan.approver_comment && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Godkännarkommentar</p>
                            <p className="text-sm text-gray-700">{loan.approver_comment}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransfers.map((transfer) => {
              const isOverdue = transfer.expected_return_date && transfer.status === 'active' && new Date(transfer.expected_return_date) < new Date();
              return (
                <div key={transfer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-gray-900">{transfer.tool_name}</p>
                    {transfer.status === 'returned' ? <Badge className="bg-gray-100 text-gray-700 border-0">Återlämnad</Badge>
                      : isOverdue ? <Badge className="bg-red-100 text-red-700 border-0">Försenad</Badge>
                      : <Badge className="bg-blue-100 text-blue-700 border-0">Aktivt lån</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{transfer.from_location_name || '—'}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-gray-700">{transfer.to_location_name || '—'}</span>
                  </div>
                  {transfer.to_person_name && <p className="text-sm text-gray-500 flex items-center gap-1"><User className="w-4 h-4" />{transfer.to_person_name}</p>}
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{transfer.transfer_date && format(new Date(transfer.transfer_date), 'd MMM yyyy')}</p>
                </div>
              );
            })}
            {filteredLoans.map((loan) => {
              const statusConfig = {
                pending: { label: 'Väntar på godkännande', color: 'bg-amber-100 text-amber-700' },
                approved: { label: 'Godkänd', color: 'bg-blue-100 text-blue-700' },
                rejected: { label: 'Avslad', color: 'bg-red-100 text-red-700' },
                returned: { label: 'Återlämnad', color: 'bg-green-100 text-green-700' }
              };
              const config = statusConfig[loan.status] || { label: loan.status, color: 'bg-gray-100 text-gray-700' };
              
              return (
                <div key={loan.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
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
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{loan.requested_by_name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{loan.destination_location_name || '—'}</span>
                    </div>
                    {loan.default_return_date && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Återlämning: {format(new Date(loan.default_return_date), 'd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>

                  {loan.approver_comment && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Godkännarkommentar</p>
                      <p className="text-sm text-gray-700">{loan.approver_comment}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}