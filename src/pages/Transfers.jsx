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

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => base44.entities.Transfer.list('-transfer_date', 200),
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

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Förflyttningshistorik</h1>
          <p className="text-gray-500 mt-1">
            {transfers.length} förflyttningar totalt
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Sök på verktyg, plats eller person..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 border-gray-200" />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[160px] h-11"><SelectValue placeholder="Tidsperiod" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                <SelectItem value="today">Idag</SelectItem>
                <SelectItem value="week">Denna vecka</SelectItem>
                <SelectItem value="month">Denna månad</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-11"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="returned">Återlämnad</SelectItem>
                <SelectItem value="overdue">Försenad</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`h-11 w-11 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><List className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`h-11 w-11 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><Grid className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Transfers */}
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ArrowRightLeft className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {transfers.length === 0 ? 'Inga förflyttningar ännu' : 'Inga matchande förflyttningar'}
            </h3>
            <p className="text-gray-500">
              {transfers.length === 0 
                ? 'Förflyttningshistorik visas här när verktyg förflyttas'
                : 'Försök justera din sökning eller datumfilter'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Datum</TableHead>
                  <TableHead className="font-semibold">Verktyg</TableHead>
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
                          : transfer.status === 'active' ? <Badge className="bg-blue-100 text-blue-700 border-0">Aktiv</Badge>
                          : <span className="text-gray-400">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                      : <Badge className="bg-blue-100 text-blue-700 border-0">Aktiv</Badge>}
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
          </div>
        )}
      </div>
    </div>
  );
}