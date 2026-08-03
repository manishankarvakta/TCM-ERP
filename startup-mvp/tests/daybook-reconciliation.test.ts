import { prisma } from "../lib/prisma";
import { getPOSClosingData } from "../app/(dashboard)/dashboard/sales/daybook/_actions/daybook.action";

async function runTest() {
  console.log("Starting POS Daybook test calculation...");
  
  // Find a completed sale to get a valid biller, warehouse, and date
  const sampleSale = await prisma.sale.findFirst({
    where: { status: "COMPLETED", isTrash: false },
    select: { createdBy: true, warehouseId: true, date: true }
  });

  if (!sampleSale) {
    console.log("No completed sales found in DB. Test skipped.");
    return;
  }

  const { createdBy, warehouseId, date } = sampleSale;
  
  // Convert date to Dhaka timezone date string YYYY-MM-DD
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const dhakaOffset = 6 * 3600000; // GMT+6
  const dhakaDate = new Date(utc + dhakaOffset);
  const dateStr = dhakaDate.toISOString().split("T")[0];

  console.log(`Running calculation for Biller: ${createdBy}, Warehouse: ${warehouseId}, Date: ${dateStr}`);
  
  const res = await getPOSClosingData(createdBy, warehouseId, dateStr);
  console.log("Test Result Summary:");
  console.log(`- Success: ${res.success}`);
  if (res.success && res.collections) {
    console.log(`- Found Collections: ${res.collections.length}`);
    for (const col of res.collections) {
      console.log(`  * ${col.name}: Regular = ${col.regularCollection}, Dues = ${col.duesCollection}, Total = ${col.totalCollection}`);
    }
    console.log(`- Today's Credit Sales: ${res.todaysCreditSales}`);
    console.log(`- Saved Session Exists: ${res.savedSession ? "Yes" : "No"}`);
    console.log("✅ POS Daybook calculation test PASSED!");
    process.exit(0);
  } else {
    console.log("❌ Test FAILED:", res.error);
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
