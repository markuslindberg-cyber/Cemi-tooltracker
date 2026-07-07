import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildArtikelSaldoMap } from '@/lib/calculateArtikelSaldo';

export default function LagerkorrigeringSection({ allItems, manualCounts, performedAt, reportId, onReportUpdated }) {
  const [correctedIds, setCorrectedIds] = useState(new Set());
  const [correcting, setCorrecting] = useState(null);
  const [allCorrecting, setAllCorrecting] = useState(false);

  const { data: lokalvardsData = [] } = useQuery({ queryKey: ['lokalvards'], queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 500) });
  const { data: inkopData = [] } = useQuery({ queryKey: ['lokalvardInkop'], queryFn: () => base44.entities.LokalvardInköp.list('-datum', 5000) });
  const { data: uttagData = [] } = useQuery({ queryKey: ['uttagAll'], queryFn: () => base44.entities.Uttag.list('-datum', 5000) });
  const { data: checkoutData = [] } = useQuery({ queryKey: ['checkoutAll'], queryFn: () => base44.entities.LokalvardCheckout.list('-checked_out_date', 5000) });

  const saldoMap = useMemo(() => {
    if (lokalvardsData.length === 0) return new Map();
    return buildArtikelSaldoMap(lokalvardsData, inkopData, uttagData, checkoutData);
  }, [lokalvardsData, inkopData, uttagData, checkoutData]);

  // Only lokalvård items that were scanned with a manual count
  const lokalvardItems = useMemo(() => {
    return allItems
      .filter(i => i._type === 'lokalvards' && manualCounts[i.id] !== undefined)
      .map(i => ({
        ...i,
        inventerat: manualCounts[i.id] ?? 0,
        lager: saldoMap.get(i.id) ?? 0,
      }))
      .filter(i => i.inventerat !== i.lager);
  }, [allItems, manualCounts, saldoMap]);

  if (lokalvardItems.length === 0) return null;

  const dateStr = performedAt
    ? new Date(performedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const removeFromReport = async (ids) => {
    if (!reportId) return;
    const updated = { ...manualCounts };
    ids.forEach(id => delete updated[id]);
    await base44.entities.InventoryReport.update(reportId, { manual_counts: updated });
    if (onReportUpdated) onReportUpdated();
  };

  const doCorrection = async (item) => {
    const diff = item.inventerat - item.lager;
    await base44.entities.LokalvardsArtikel.update(item.id, { current_quantity: item.inventerat });
    if (diff > 0) {
      await base44.entities.LokalvardInköp.create({
        artikel_id: item.id, datum: dateStr, antal: diff,
        pris: item.pris ?? 0, ordernummer: `INVENTERING ${dateStr}`,
      });
    } else {
      await base44.entities.Uttag.create({
        datum: new Date(performedAt || Date.now()).toISOString(),
        personal_id: 'system', personal_namn: 'Inventering',
        kund_id: 'inventering', kund_namn: 'INVENTERING',
        artiklar: [{ artikel_id: item.id, benamning: item.benamning || item.name,
          antal: Math.abs(diff), pris_per_enhet: item.pris ?? 0,
          total_pris: Math.abs(diff) * (item.pris ?? 0) }],
        total_kostnad: Math.abs(diff) * (item.pris ?? 0),
        manad: dateStr.slice(0, 7), ordernummer: `INVENTERING ${dateStr}`,
      });
    }
  };

  const correctItem = async (item) => {
    setCorrecting(item.id);
    await doCorrection(item);
    setCorrectedIds(prev => new Set([...prev, item.id]));
    await removeFromReport([item.id]);
    setCorrecting(null);
  };

  const correctAll = async () => {
    setAllCorrecting(true);
    const uncorrected = lokalvardItems.filter(i => !correctedIds.has(i.id));
    for (const item of uncorrected) {
      await doCorrection(item);
    }
    const allIds = uncorrected.map(i => i.id);
    setCorrectedIds(prev => new Set([...prev, ...allIds]));
    await removeFromReport(allIds);
    setAllCorrecting(false);
  };

  const uncorrectedCount = lokalvardItems.filter(i => !correctedIds.has(i.id)).length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Lagerkorrigering ({lokalvardItems.length} avvikelser)
        </h2>
        {uncorrectedCount > 0 && (
          <Button
            size="sm"
            onClick={correctAll}
            disabled={allCorrecting}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {allCorrecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Korrigera alla ({uncorrectedCount})
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {lokalvardItems.map(item => {
          const diff = item.inventerat - item.lager;
          const done = correctedIds.has(item.id);
          const isLoading = correcting === item.id;

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                done
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {item.benamning || item.name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-gray-500">Lager: {item.lager}</span>
                  <span className="text-gray-500">Inventerat: {item.inventerat}</span>
                  <Badge className={cn("text-xs", diff > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                    {diff > 0 ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                    {diff > 0 ? `+${diff}` : diff}
                  </Badge>
                </div>
              </div>
              <div className="ml-3 shrink-0">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => correctItem(item)}
                    disabled={isLoading || allCorrecting}
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Korrigera'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}