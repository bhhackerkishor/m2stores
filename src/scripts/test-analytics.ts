import "dotenv/config";
import { ExecutiveDashboardService } from "@/services/analytics/executive.overview";
import { RevenueAnalyticsService } from "@/services/analytics/revenue.analytics";
import { ProfitAnalyticsService } from "@/services/analytics/profit.analytics";
import { OrderAnalyticsService } from "@/services/analytics/order.analytics";
import { PaymentAnalyticsService } from "@/services/analytics/payment.analytics";
import { InventoryAnalyticsService } from "@/services/analytics/inventory.analytics";
import { CustomerAnalyticsService } from "@/services/analytics/customer.analytics";
import { ActionCenterService } from "@/services/analytics/action-center";

async function main() {
  const range = "7d" as const;

  console.log("=== executive ===");
  const ex = await ExecutiveDashboardService.overview(range);
  console.log(
    "kpis:",
    ex.kpis.map((k) => `${k.id}=${k.display}`).join(" | ")
  );
  console.log("actions:", ex.actionCenter.length, "revenue:", ex.revenue.revenue, "paid:", ex.revenue.paidOrders);

  console.log("=== revenue ===");
  const rev = await RevenueAnalyticsService.overview(range);
  console.log({
    gross: rev.grossSales,
    net: rev.netSales,
    rev: rev.revenue,
    orders: rev.paidOrders,
    aov: rev.aov,
    refunds: rev.refunds,
    series: rev.series.length,
  });

  console.log("=== profit ===");
  const p = await ProfitAnalyticsService.overview(range);
  console.log({ net: p.netSales, cogs: p.cogs, gp: p.grossProfit, cover: p.dataQuality.cogsCoverage, top: p.topProfitProducts.length });

  console.log("=== orders ===");
  const o = await OrderAnalyticsService.overview(range);
  console.log({ all: o.totals.all, paid: o.totals.paid, aov: o.value.aov, funnel: o.funnel.length });

  console.log("=== payments ===");
  const pay = await PaymentAnalyticsService.overview(range);
  console.log({ success: pay.successRate, exceptions: pay.exceptions.length, byStatus: pay.byStatus.length });

  console.log("=== inventory ===");
  const inv = await InventoryAnalyticsService.overview(range);
  console.log({
    skus: inv.totals.skus,
    low: inv.totals.lowStockSkus,
    out: inv.totals.outOfStockSkus,
    val: inv.totals.inventoryValue,
    moves: inv.movements.length,
  });

  console.log("=== customers ===");
  const c = await CustomerAnalyticsService.overview(range);
  console.log({
    all: c.totals.customersAllTime,
    newC: c.totals.newCustomers,
    active: c.totals.activeInRange,
    repeat: c.totals.repeatRatePct,
    seg: c.segments.length,
  });

  console.log("=== action ===");
  const a = await ActionCenterService.list(range);
  for (const item of a) console.log(`${item.priority}: ${item.title} x${item.count}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
