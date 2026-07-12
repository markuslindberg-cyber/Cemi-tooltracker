import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Fetches live counts from all entities for the Knowledge Graph
export function useKnowledgeGraphStats() {
  return useQuery({
    queryKey: ['knowledgeGraphStats'],
    queryFn: async () => {
      const [
        tools, handTools, arbetsklader, lokalvardsArtiklar,
        locations, teamMembers, loanRequests, workwearRequests,
        lokalvardRequests, uttag, inkop, checkouts,
        inventorySessions, inventoryReports, serviceRecords,
        huvudmaskiner, categories, kunder, toolLogs,
        materialLager, transfers, checkoutReports,
      ] = await Promise.all([
        base44.entities.Tool.filter({ is_deleted: { $ne: true } }),
        base44.entities.HandTool.filter({ is_deleted: { $ne: true } }),
        base44.entities.ArbetskläderUtrustning.filter({ is_deleted: { $ne: true } }),
        base44.entities.LokalvardsArtikel.filter({ is_deleted: { $ne: true } }),
        base44.entities.Location.list(),
        base44.entities.TeamMember.list(),
        base44.entities.LoanRequest.list(),
        base44.entities.WorkwearRequest.list(),
        base44.entities.LokalvardArtikelRequest.list(),
        base44.entities.Uttag.list(),
        base44.entities.LokalvardInköp.list(),
        base44.entities.LokalvardCheckout.list(),
        base44.entities.InventorySession.list(),
        base44.entities.InventoryReport.list(),
        base44.entities.ServiceRecord.list(),
        base44.entities.Huvudmaskin.list(),
        base44.entities.Category.list(),
        base44.entities.Kund.list(),
        base44.entities.ToolLog.list(),
        base44.entities.MaterialLager.filter({ is_deleted: { $ne: true } }),
        base44.entities.Transfer.list(),
        base44.entities.CheckoutReport.list(),
      ]);

      // Role distribution from team members
      const roleDistribution = {};
      teamMembers.filter(m => m.is_active !== false).forEach(m => {
        const role = m.role || 'okänd';
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });

      // Loan status breakdown
      const loanStatuses = {};
      loanRequests.forEach(lr => {
        const s = lr.status || 'unknown';
        loanStatuses[s] = (loanStatuses[s] || 0) + 1;
      });

      // Workwear request status breakdown
      const workwearStatuses = {};
      workwearRequests.forEach(wr => {
        const s = wr.status || 'unknown';
        workwearStatuses[s] = (workwearStatuses[s] || 0) + 1;
      });

      // Location types
      const locationTypes = {};
      locations.filter(l => l.is_active !== false).forEach(l => {
        const t = l.type || 'other';
        locationTypes[t] = (locationTypes[t] || 0) + 1;
      });

      return {
        counts: {
          e_tool: tools.length,
          e_handtool: handTools.length,
          e_arbetsklader: arbetsklader.length,
          e_lokalvardsartikel: lokalvardsArtiklar.length,
          e_location: locations.filter(l => l.is_active !== false).length,
          e_teammember: teamMembers.filter(m => m.is_active !== false).length,
          e_loanrequest: loanRequests.length,
          e_workwearrequest: workwearRequests.length,
          e_lokalvardrequest: lokalvardRequests.length,
          e_uttag: uttag.length,
          e_inkop: inkop.length,
          e_checkout: checkouts.length,
          e_inventorysession: inventorySessions.length,
          e_inventoryreport: inventoryReports.length,
          e_servicerecord: serviceRecords.length,
          e_huvudmaskin: huvudmaskiner.length,
          e_category: categories.length,
          e_kund: kunder.length,
          e_toollog: toolLogs.length,
          e_transfer: transfers.length,
          e_checkoutreport: checkoutReports.length,
          e_materiallager: materialLager.length,
        },
        roleDistribution,
        loanStatuses,
        workwearStatuses,
        locationTypes,
        totalActiveTeam: teamMembers.filter(m => m.is_active !== false).length,
        totalInactiveTeam: teamMembers.filter(m => m.is_active === false).length,
        fetchedAt: new Date().toISOString(),
      };
    },
    staleTime: 30_000, // refetch every 30s
  });
}