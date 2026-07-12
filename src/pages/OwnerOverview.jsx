import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { Shield, Download, Loader2, Network, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { useUnit } from '@/hooks/useUnitContext';
import { cn } from '@/lib/utils';
import MaskinerSection from '@/components/owner/MaskinerSection';
import HandredskapSection from '@/components/owner/HandredskapSection';
import ArbetskladerSection from '@/components/owner/ArbetskladerSection';
import LokalvardSection from '@/components/owner/LokalvardSection';
import MaterialSection from '@/components/owner/MaterialSection';
import OwnerTotalSummary from '@/components/owner/OwnerTotalSummary';

export default function OwnerOverview() {
  const [exporting, setExporting] = React.useState(false);
  const { units } = useUnit();
  const [activeTab, setActiveTab] = useState('all'); // 'all' = Företag, or unit id
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportAllData', {});
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tooltrack-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export klar', description: 'JSON-filen har laddats ned.' });
    } catch (err) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'ägare') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Ägaröversikt</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Samlad statistik för alla avdelningar</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/KnowledgeGraph">
                <Network className="w-4 h-4" />
                Knowledge Graph
              </Link>
            </Button>
            <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportera all data (JSON)
            </Button>
          </div>
        </div>

        {/* Unit Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === 'all'
                ? "bg-[#8B1E1E] text-white shadow-sm"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            )}
          >
            <Building2 className="w-4 h-4" />
            Företag (alla enheter)
          </button>
          {units.map(unit => (
            <button
              key={unit.id}
              onClick={() => setActiveTab(unit.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === unit.id
                  ? "bg-[#8B1E1E] text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
              )}
            >
              {unit.name}
            </button>
          ))}
        </div>

        {/* Total Summary */}
        <OwnerTotalSummary unitFilter={activeTab === 'all' ? null : activeTab} />

        {/* Sections */}
        <div className="space-y-10">
          <MaskinerSection unitFilter={activeTab === 'all' ? null : activeTab} />
          <hr className="border-gray-200 dark:border-gray-800" />
          <HandredskapSection unitFilter={activeTab === 'all' ? null : activeTab} />
          <hr className="border-gray-200 dark:border-gray-800" />
          <ArbetskladerSection unitFilter={activeTab === 'all' ? null : activeTab} />
          <hr className="border-gray-200 dark:border-gray-800" />
          <LokalvardSection unitFilter={activeTab === 'all' ? null : activeTab} />
          <hr className="border-gray-200 dark:border-gray-800" />
          <MaterialSection unitFilter={activeTab === 'all' ? null : activeTab} />
        </div>
      </div>
    </div>
  );
}