import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, ChevronDown, X, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function LokalvardKostnadPerKund() {
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);

  const { data: uttag = [], isLoading: loadingUttag } = useQuery({
    queryKey: ['uttag'],
    queryFn: () => base44.entities.Uttag.list('-datum', 10000).catch(() => []),
  });

  const { data: kunder = [] } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list().catch(() => []),
  });

  const availableMonths = useMemo(
    () => [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [uttag]
  );

  const costData = useMemo(() => {
    const filtered = uttag.filter(u => 
      (selectedMonths.length === 0 || selectedMonths.includes(u.manad))
    );

    const costMap = {};
    filtered.forEach(u => {
      if (!costMap[u.kund_id]) {
        const kund = kunder.find(k => k.id === u.kund_id);
        costMap[u.kund_id] = { kund_id: u.kund_id, namn: kund?.namn || 'Okänd', total: 0 };
      }
      costMap[u.kund_id].total += u.total_kostnad;
    });

    return Object.values(costMap).sort((a, b) => b.total - a.total);
  }, [uttag, kunder, selectedMonths]);

  const data = selectedCustomerIds.length === 0
    ? costData
    : costData.filter(d => selectedCustomerIds.includes(d.kund_id));

  const total = data.reduce((sum, item) => sum + item.total, 0);

  const handleExport = () => {
    const csv = ['Kund,Kostnad (kr)\n', ...data.map(d => `${d.namn},${d.total.toFixed(2)}`), `Totalt,${total.toFixed(2)}`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kostnad_${selectedMonths.length > 0 ? selectedMonths.join('_') : 'alla'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingUttag) return <div className="flex justify-center p-8">Laddar...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          Kostnad per kund
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Månad filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase">Månad</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600">
                  {selectedMonths.length === 0 ? 'Alla' : `${selectedMonths.length}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableMonths.map(p => (
                    <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedMonths.includes(p)} onCheckedChange={(checked) => setSelectedMonths(prev => checked ? [...prev, p] : prev.filter(x => x !== p))} />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
                {selectedMonths.length > 0 && (
                  <button onClick={() => setSelectedMonths([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Kund filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase">Kund</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600">
                  {selectedCustomerIds.length === 0 ? 'Alla' : `${selectedCustomerIds.length}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {kunder.map(k => (
                    <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedCustomerIds.includes(k.id)} onCheckedChange={(checked) => setSelectedCustomerIds(prev => checked ? [...prev, k.id] : prev.filter(x => x !== k.id))} />
                      <span className="text-sm">{k.namn}</span>
                    </label>
                  ))}
                </div>
                {selectedCustomerIds.length > 0 && (
                  <button onClick={() => setSelectedCustomerIds([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {data.length > 0 && (
            <Button onClick={handleExport} size="sm" className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          )}
        </div>
      </div>

      {data.length > 0 ? (
        <>
          {/* Totalt summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">Totalt alla kunder ({data.length})</span>
            <span className="text-xl font-bold text-blue-900">{total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="namn" angle={-40} textAnchor="end" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`${value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`, 'Kostnad']} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {data.map((item, index) => (
              <div
                key={item.kund_id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="flex-1 text-left font-medium text-sm">{item.namn}</span>
                <div className="text-right">
                  <div className="font-bold text-sm">{item.total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</div>
                  <div className="text-xs text-gray-400">{total > 0 ? ((item.total / total) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">Ingen data för vald period</div>
      )}
    </div>
  );
}