import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, ChevronDown, ChevronUp, User, Calendar, Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CheckoutReports() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['checkoutReports'],
    queryFn: () => base44.entities.CheckoutReport.list('-checked_out_date', 500),
  });

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const searchLower = search.toLowerCase();
      return (
        report.project?.toLowerCase().includes(searchLower) ||
        report.recipient_first_name?.toLowerCase().includes(searchLower) ||
        report.recipient_last_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [reports, search]);

  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      alert('Inga rapporter att exportera');
      return;
    }

    // Skapa CSV-innehål
    const headers = ['Projekt', 'Mottagare', 'Datum', 'Antal artiklar', 'Artiklar'];
    const rows = filteredReports.map(report => {
      const itemsText = report.checked_out_items
        .map(item => `${item.name} (${item.quantity})`)
        .join('; ');
      
      return [
        report.project || '',
        `${report.recipient_first_name} ${report.recipient_last_name}`,
        new Date(report.checked_out_date).toLocaleDateString('sv-SE'),
        report.checked_out_items.length,
        itemsText,
      ];
    });

    // Konvertera till CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Skapa och ladda ner fil
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `uttagsrapporter_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Uttagsrapporter</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{filteredReports.length} rapporter</p>
          </div>
          <Button
            onClick={exportToExcel}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportera alla
          </Button>
        </div>

        {/* Sök */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Sök efter projekt eller mottagare..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Rapporter */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Inga rapporter hittades</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Mottagare</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Artiklar</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const isExpanded = expandedId === report.id;
                  return (
                    <React.Fragment key={report.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedId(isExpanded ? null : report.id)}
                      >
                        <TableCell className="font-medium">{report.project}</TableCell>
                        <TableCell>
                          {report.recipient_first_name} {report.recipient_last_name}
                        </TableCell>
                        <TableCell>
                          {new Date(report.checked_out_date).toLocaleDateString('sv-SE')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {report.checked_out_items.slice(0, 3).map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item.name} ({item.quantity})
                              </Badge>
                            ))}
                            {report.checked_out_items.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{report.checked_out_items.length - 3} till
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-8">
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-6 space-y-4">
                              {/* Mottagarinformation */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex items-start gap-2">
                                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Mottagare</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {report.recipient_first_name} {report.recipient_last_name}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Projekt</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.project}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Datum & tid</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {new Date(report.checked_out_date).toLocaleString('sv-SE')}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Artikellista */}
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-2">
                                  Uttagna artiklar ({report.checked_out_items.length} st)
                                </p>
                                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                                  {report.checked_out_items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                        {item.subcategory && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.subcategory}</p>
                                        )}
                                      </div>
                                      <Badge variant="outline" className="text-xs font-semibold">
                                        {item.quantity} st
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}