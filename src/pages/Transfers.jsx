import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { format } from 'date-fns';

export default function Transfers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

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

    return matchesSearch && matchesDate;
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
          <h1 className="text-3xl font-bold text-gray-900">Transfer History</h1>
          <p className="text-gray-500 mt-1">
            {transfers.length} total transfer{transfers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by tool, location, or person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[160px] h-11">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transfers List */}
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ArrowRightLeft className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {transfers.length === 0 ? 'No transfers yet' : 'No matching transfers'}
            </h3>
            <p className="text-gray-500">
              {transfers.length === 0 
                ? 'Transfer history will appear here when tools are moved'
                : 'Try adjusting your search or date filter'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Tool</TableHead>
                  <TableHead className="font-semibold">From</TableHead>
                  <TableHead className="font-semibold">To</TableHead>
                  <TableHead className="font-semibold">Assigned To</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((transfer) => (
                  <TableRow key={transfer.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {transfer.transfer_date && format(new Date(transfer.transfer_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transfer.transfer_date && format(new Date(transfer.transfer_date), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{transfer.tool_name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{transfer.from_location_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          <MapPin className="w-3 h-3 mr-1" />
                          {transfer.to_location_name || '—'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transfer.to_person_name ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{transfer.to_person_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-500 max-w-xs truncate">
                        {transfer.notes || '—'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}