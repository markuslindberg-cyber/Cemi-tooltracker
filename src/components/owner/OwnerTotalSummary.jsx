import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Package, Shovel, Shirt, SprayCan, Boxes } from 'lucide-react';
import { calculateDepreciatedValue } from '@/lib/depreciationUtils';
import { calculateLokalvardLagerValue } from '@/lib/lokalvardLagerUtils';

export default function OwnerTotalSummary({ unitFilter, units = [] }) {
  const { data: allTools = [] } = useQuery({
    queryKey: ['ownerTools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 10000).then(r => r.filter(t => !t.is_deleted)),
  });

  const { data: allHandTools = [] } = useQuery({
    queryKey: ['ownerHandTools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 10000).then(r => r.filter(t => !t.is_deleted)),
  });

  const { data: allWorkwear = [] } = useQuery({
    queryKey: ['ownerWorkwear'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 10000).then(r => r.filter(t => !t.is_deleted)),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['ownerLokalvardArticles'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).then(r => r.filter(a => !a.is_deleted)),
  });

  const { data: depSettings = [] } = useQuery({
    queryKey: ['depreciationSettings'],
    queryFn: () => base44.entities.DepreciationSetting.list(),
  });

  const { data: uttag = [] } = useQuery({
    queryKey: ['ownerUttag'],
    queryFn: () => base44.entities.Uttag.list(null, 100000).then(r => Array.isArray(r) ? r : []),
  });

  const { data: inkop = [] } = useQuery({
    queryKey: ['ownerInkop'],
    queryFn: () => base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list() : Promise.resolve([]),
  });

  const { data: checkout = [] } = useQuery({
    queryKey: ['ownerCheckout'],
    queryFn: () => base44.entities.LokalvardCheckout?.list
      ? base44.entities.LokalvardCheckout.list(null, 100000).catch(() => [])
      : Promise.resolve([]),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: allMaterials = [] } = useQuery({
    queryKey: ['ownerMaterials'],
    queryFn: () => base44.entities.MaterialLager.filter({ is_deleted: false }),
  });

  const unitLocationIds = React.useMemo(() => {
    if (!unitFilter) return null;
    return new Set(locations.filter(l => l.unit_id === unitFilter).map(l => l.id));
  }, [locations, unitFilter]);

  const unassignedTools = allTools.filter(t => !t.location_id);
  const tools = unitLocationIds
    ? allTools.filter(t => t.location_id && unitLocationIds.has(t.location_id))
    : allTools;
  const handTools = unitLocationIds
    ? allHandTools.filter(t => t.location_id && unitLocationIds.has(t.location_id))
    : allHandTools;
  const workwear = unitLocationIds
    ? allWorkwear.filter(t => t.location_id && unitLocationIds.has(t.location_id))
    : allWorkwear;

  const HIDDEN = ['såld', 'sålda', 'retired'];
  const activeTools = tools.filter(t => !HIDDEN.includes(t.status));

  const maskinerPurchaseValue = activeTools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);
  const maskinerValue = activeTools.reduce((sum, t) => {
    const { currentValue } = calculateDepreciatedValue(t, depSettings);
    return sum + currentValue;
  }, 0);
  const handredskapValue = handTools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);
  const activeUnit = units.find(u => u.id === unitFilter);
  const isUtemiljo = activeUnit?.name?.toLowerCase() === 'utemiljö';
  const showLokalvardArbetsklader = !unitFilter || isUtemiljo;

  const workwearValue = showLokalvardArbetsklader
    ? workwear.reduce((sum, t) => sum + (t.purchase_price || 0) * (t.quantity || 1), 0)
    : 0;
  const lokalvardValue = showLokalvardArbetsklader
    ? calculateLokalvardLagerValue(articles, uttag, inkop, checkout)
    : 0;

  const materials = unitFilter
    ? allMaterials.filter(m => m.unit_id === unitFilter)
    : allMaterials;
  const materialValue = materials.filter(m => m.status === 'i_lager').reduce((sum, m) => sum + (m.inkopspris || 0) * (m.antal || 0), 0);

  const totalValue = maskinerValue + handredskapValue + workwearValue + lokalvardValue + materialValue;

  const sections = [
    { label: 'Maskiner (bokfört)', value: maskinerValue, icon: Package, color: 'text-[#8B1E1E]', bg: 'bg-[#8B1E1E]/10', subtitle: unitFilter && unassignedTools.filter(t => !['såld','sålda','retired'].includes(t.status)).length > 0 ? `${unassignedTools.filter(t => !['såld','sålda','retired'].includes(t.status)).length} utan plats ej inkl.` : (maskinerPurchaseValue !== maskinerValue ? `Inköp: ${maskinerPurchaseValue.toLocaleString('sv-SE')} kr` : null) },
    { label: 'Handredskap', value: handredskapValue, icon: Shovel, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    ...(showLokalvardArbetsklader ? [
      { label: 'Arbetskläder', value: workwearValue, icon: Shirt, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
      { label: 'Lokalvård (lager)', value: lokalvardValue, icon: SprayCan, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    ] : []),
    { label: 'Materialbanken', value: materialValue, icon: Boxes, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#8B1E1E]/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[#8B1E1E]" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Totalt bokfört värde</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#8B1E1E]">{totalValue.toLocaleString('sv-SE')} kr</p>
          {maskinerPurchaseValue !== maskinerValue && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Totalt investerat: {(maskinerPurchaseValue + handredskapValue + workwearValue + lokalvardValue).toLocaleString('sv-SE')} kr</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sections.map(s => (
          <div key={s.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.value.toLocaleString('sv-SE')} kr</p>
              {s.subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{s.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}