import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, ChevronDown, X, TrendingUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function KostnadPerKund() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [availableCustomerTypes, setAvailableCustomerTypes] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerTypeMap, setCustomerTypeMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uttag, kunder, personal] = await Promise.all([
          base44.entities.Uttag.list(null, 10000),
          base44.entities.Kund.list(null, 10000),
          base44.entities.TeamMember.list(null, 10000)
        ]);
        setAllCustomers(kunder);

        // Create customer type map
        const typeMap = {};
        kunder.forEach(k => {
          typeMap[k.id] = k.typ;
        });
        setCustomerTypeMap(typeMap);

        const periods = [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a));
        setAvailablePeriods(periods);

        const types = [...new Set(kunder.map(k => k.typ).filter(Boolean))].sort();
        setAvailableCustomerTypes(types);

        const customerMap = {};
        kunder.forEach(k => {
          customerMap[k.id] = k.namn;
        });

        const personalMap = {};
        personal.forEach(p => {
          personalMap[p.id] = p.name;
        });

        const costMap = {};
        uttag.forEach(u => {
          if (!costMap[u.kund_id]) {
            const kundenObj = kunder.find(k => k.id === u.kund_id);
            costMap[u.kund_id] = { 
              kund_id: u.kund_id, 
              namn: customerMap[u.kund_id] || u.kund_namn || 'Okänd', 
              kundtyp: kundenObj?.typ || 'Okänd',
              personal_namn: personalMap[u.personal_id] || u.personal_namn || 'Okänd', 
              total: 0 
            };
          }
          costMap[u.kund_id].total += u.total_kostnad;
        });

        const sorted = Object.values(costMap).sort((a, b) => b.total - a.total);
        
        // Uppdatera tillgängliga kundtyper baserat på faktisk data
        const typesFromData = [...new Set(sorted.map(item => item.kundtyp).filter(Boolean))].sort();
        setAvailableCustomerTypes(typesFromData);
        
        setAllData(sorted);
      } catch (error) {
        toast.error('Kunde inte ladda kostnaddata');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const data = allData
    .filter(d => selectedCustomerIds.length === 0 || selectedCustomerIds.includes(d.kund_id))
    .filter(d => selectedCustomerTypes.length === 0 || selectedCustomerTypes.includes(d.kundtyp));

  const total = data.reduce((sum, item) => sum + item.total, 0);

  const handleExport = () => {
    const csv = ['Kund,Kostnad (kr)\n', ...data.map(d => `${d.namn},${d.total.toFixed(2)}`), `Totalt,${total.toFixed(2)}`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kostnad_${selectedPeriods.length > 0 ? selectedPeriods.join('_') : 'alla'}.csv`;
    a.click();
  };

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  const hasActiveFilters = selectedPeriods.length > 0 || selectedCustomerIds.length > 0 || selectedCustomerTypes.length > 0;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-blue-500" />
          Kostnad per kund
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {hasActiveFilters && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSelectedPeriods([]);
                setSelectedCustomerIds([]);
                setSelectedCustomerTypes([]);
              }}
              className="gap-1 text-xs"
            >
              <RotateCcw className="w-3 h-3" /> Rensa alla
            </Button>
          )}

          {/* Period filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                  {selectedPeriods.length === 0 ? 'Alla' : `${selectedPeriods.length} vald${selectedPeriods.length > 1 ? 'a' : ''}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availablePeriods.map(p => (
                    <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={selectedPeriods.includes(p)}
                        onCheckedChange={(checked) => {
                          setSelectedPeriods(prev => checked ? [...prev, p] : prev.filter(id => id !== p));
                        }}
                      />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
                {selectedPeriods.length > 0 && (
                  <button onClick={() => setSelectedPeriods([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Kundtyp filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kundtyp</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                  {selectedCustomerTypes.length === 0 ? 'Alla' : `${selectedCustomerTypes.length} vald${selectedCustomerTypes.length > 1 ? 'a' : ''}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableCustomerTypes.map(type => (
                    <label key={type} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={selectedCustomerTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          setSelectedCustomerTypes(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
                        }}
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
                {selectedCustomerTypes.length > 0 && (
                  <button onClick={() => setSelectedCustomerTypes([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Kund filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kund</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                  {selectedCustomerIds.length === 0 ? 'Alla' : `${selectedCustomerIds.length} vald${selectedCustomerIds.length > 1 ? 'a' : ''}`}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" align="end">
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {allCustomers.map(k => (
                    <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={selectedCustomerIds.includes(k.id)}
                        onCheckedChange={(checked) => {
                          setSelectedCustomerIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id));
                        }}
                      />
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
            <span className="text-sm text-blue-700 font-medium">Totalt alla kunder</span>
            <span className="text-xl font-bold text-blue-900">{total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Kostnadsfördelning</h2>
            <ResponsiveContainer width="100%" height={Math.max(40 * data.length, 300)}>
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="namn" type="category" tick={{ fontSize: 12 }} width={115} />
                <Tooltip formatter={(value) => [`${value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`, 'Kostnad']} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* List */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Detaljerad lista</h2>
            <div className="max-h-[500px] overflow-y-auto">
              {data.map((item, index) => (
                <div
                  key={item.kund_id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0 hover:bg-gray-50 px-2 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-700">{item.namn}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{item.total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</div>
                    <div className="text-xs text-gray-500">{total > 0 ? ((item.total / total) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">Inga uttag matchar de valda filtren.</div>
      )}
    </div>
  );
}