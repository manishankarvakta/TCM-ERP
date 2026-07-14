import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔄  Database Reset - Fresh Start Script");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  WARNING: This will permanently delete transactional and item data.");
  console.log("   Chart of Accounts, Users, Employees, Settings, and Policies will be kept.\n");

  try {
    console.log("🔄 Disabling foreign key constraints (PostgreSQL replica mode)...");
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    // --- SALES & RETURNS ---
    console.log("📦 Clearing Sales & Returns...");
    const saleItems = await prisma.saleItem.deleteMany({});
    const sales = await prisma.sale.deleteMany({});
    const coupons = await prisma.coupon.deleteMany({});
    const clientItemDiscounts = await prisma.clientItemDiscount.deleteMany({});
    console.log(`   ✓ Deleted ${saleItems.count} SaleItem, ${sales.count} Sale, ${coupons.count} Coupon, and ${clientItemDiscounts.count} ClientItemDiscount records.`);

    // --- PROCUREMENTS ---
    console.log("📦 Clearing Procurements...");
    const grnItems = await prisma.gRNItem.deleteMany({});
    const grns = await prisma.gRN.deleteMany({});
    const tpnItems = await prisma.transferPurchaseNoteItem.deleteMany({});
    const tpns = await prisma.transferPurchaseNote.deleteMany({});
    const rtvItems = await prisma.returnToVendorItem.deleteMany({});
    const rtvs = await prisma.returnToVendor.deleteMany({});
    const purchaseItems = await prisma.purchaseItem.deleteMany({});
    const purchases = await prisma.purchase.deleteMany({});
    console.log(`   ✓ Deleted ${grnItems.count} GRNItem, ${grns.count} GRN, ${tpnItems.count} TPNItem, ${tpns.count} TPN, ${rtvItems.count} RTVItem, ${rtvs.count} RTV, ${purchaseItems.count} PurchaseItem, and ${purchases.count} Purchase records.`);

    // --- INVENTORIES ---
    console.log("📦 Clearing Inventories...");
    const invAdjItems = await prisma.inventoryAdjustmentItem.deleteMany({});
    const invAdjs = await prisma.inventoryAdjustment.deleteMany({});
    const invDamageItems = await prisma.inventoryDamageItem.deleteMany({});
    const invDamages = await prisma.inventoryDamage.deleteMany({});
    const invCountEntries = await prisma.inventoryCountEntry.deleteMany({});
    const stockLedgers = await prisma.stockLedger.deleteMany({});
    const stocks = await prisma.stock.deleteMany({});
    const fabricRolls = await prisma.fabricRoll.deleteMany({});
    const cuttingJobFabricRolls = await prisma.cuttingJobFabricRoll.deleteMany({});
    console.log(`   ✓ Deleted ${invAdjItems.count} InventoryAdjustmentItem, ${invAdjs.count} InventoryAdjustment, ${invDamageItems.count} InventoryDamageItem, ${invDamages.count} InventoryDamage, ${invCountEntries.count} InventoryCountEntry, ${stockLedgers.count} StockLedger, ${stocks.count} Stock, ${fabricRolls.count} FabricRoll, and ${cuttingJobFabricRolls.count} CuttingJobFabricRoll records.`);

    // --- PRODUCTION ---
    console.log("📦 Clearing Production...");
    const rfidScans = await prisma.rFIDBundleScan.deleteMany({});
    const productionBundles = await prisma.productionBundle.deleteMany({});
    const cuttingJobs = await prisma.cuttingJob.deleteMany({});
    const washingJobs = await prisma.washingJob.deleteMany({});
    const sewingLineTracks = await prisma.sewingLineTrack.deleteMany({});
    const productionStages = await prisma.garmentProductionStage.deleteMany({});
    const cmtBreakdowns = await prisma.cMTCostBreakdown.deleteMany({});
    const productionOrders = await prisma.productionOrder.deleteMany({});
    const bomItems = await prisma.bOMItem.deleteMany({});
    const boms = await prisma.bOM.deleteMany({});
    console.log(`   ✓ Deleted ${rfidScans.count} RFIDBundleScan, ${productionBundles.count} ProductionBundle, ${cuttingJobs.count} CuttingJob, ${washingJobs.count} WashingJob, ${sewingLineTracks.count} SewingLineTrack, ${productionStages.count} GarmentProductionStage, ${cmtBreakdowns.count} CMTCostBreakdown, ${productionOrders.count} ProductionOrder, ${bomItems.count} BOMItem, and ${boms.count} BOM records.`);

    // --- ITEMS & VARIANTS ---
    console.log("📦 Clearing Items & Variants...");
    const productVariants = await prisma.productVariant.deleteMany({});
    const items = await prisma.item.deleteMany({});
    const categories = await prisma.category.deleteMany({});
    const brands = await prisma.brand.deleteMany({});
    const seasons = await prisma.season.deleteMany({});
    const collections = await prisma.collection.deleteMany({});
    const fabrics = await prisma.fabric.deleteMany({});
    const ieBreakdowns = await prisma.industrialEngineeringBreakdown.deleteMany({});
    const garmentOperations = await prisma.garmentOperation.deleteMany({});
    console.log(`   ✓ Deleted ${productVariants.count} ProductVariant, ${items.count} Item, ${categories.count} Category, ${brands.count} Brand, ${seasons.count} Season, ${collections.count} Collection, ${fabrics.count} Fabric, ${ieBreakdowns.count} IEBreakdown, and ${garmentOperations.count} GarmentOperation records.`);

    // --- HR & PAYROLL TRANSACTIONS ---
    console.log("📦 Clearing HR & Payroll Transactions...");
    const payrollItems = await prisma.payrollItem.deleteMany({});
    const payrolls = await prisma.payroll.deleteMany({});
    const employeeLoans = await prisma.employeeLoan.deleteMany({});
    const overtimes = await prisma.overtime.deleteMany({});
    const attendances = await prisma.attendance.deleteMany({});
    const attendanceLogs = await prisma.attendanceLog.deleteMany({});
    const leaveApplications = await prisma.leaveApplication.deleteMany({});
    const resignations = await prisma.resignation.deleteMany({});
    const biometricSyncLogs = await prisma.biometricSyncLog.deleteMany({});
    const biometricRawLogs = await prisma.biometricRawLog.deleteMany({});
    const unmappedBiometricLogs = await prisma.unmappedBiometricLog.deleteMany({});
    const biometricCommands = await prisma.biometricCommand.deleteMany({});
    console.log(`   ✓ Deleted ${payrollItems.count} PayrollItem, ${payrolls.count} Payroll, ${employeeLoans.count} EmployeeLoan, ${overtimes.count} Overtime, ${attendances.count} Attendance, ${attendanceLogs.count} AttendanceLog, ${leaveApplications.count} LeaveApplication, ${resignations.count} Resignation, ${biometricSyncLogs.count} BiometricSyncLog, ${biometricRawLogs.count} BiometricRawLog, ${unmappedBiometricLogs.count} UnmappedBiometricLog, and ${biometricCommands.count} BiometricCommand records.`);

    // --- FINANCIAL TRANSACTIONS ---
    console.log("📦 Clearing Financial Transactions...");
    const journalEntryLines = await prisma.journalEntryLine.deleteMany({});
    const journalEntries = await prisma.journalEntry.deleteMany({});
    const voucherLines = await prisma.voucherLine.deleteMany({});
    const vouchers = await prisma.voucher.deleteMany({});
    console.log(`   ✓ Deleted ${journalEntryLines.count} JournalEntryLine, ${journalEntries.count} JournalEntry, ${voucherLines.count} VoucherLine, and ${vouchers.count} Voucher records.`);

    // --- CUSTOMERS & SUPPLIERS ---
    console.log("📦 Clearing Customers & Suppliers...");
    const clientAddresses = await prisma.clientAddress.deleteMany({});
    const clients = await prisma.client.deleteMany({});
    const suppliers = await prisma.supplier.deleteMany({});
    console.log(`   ✓ Deleted ${clientAddresses.count} ClientAddress, ${clients.count} Client, and ${suppliers.count} Supplier records.`);

    console.log("🔄 Re-enabling foreign key constraints...");
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Database reset completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Output stats of kept master data
    const userCount = await prisma.user.count();
    const employeeCount = await prisma.employee.count();
    const coaCount = await prisma.chartOfAccount.count();
    const settingsCount = await prisma.settings.count();
    const hrPolicyCount = await prisma.salaryStructurePolicy.count();

    console.log(`\n📊 Summary of Kept Master Data:`);
    console.log(`   • Users: ${userCount}`);
    console.log(`   • Employees: ${employeeCount}`);
    console.log(`   • Chart of Accounts (COA): ${coaCount}`);
    console.log(`   • System Settings: ${settingsCount}`);
    console.log(`   • HR/Payroll Policies: ${hrPolicyCount}`);
    console.log("\n✨ Ready for fresh start!\n");

  } catch (error) {
    console.error("\n❌ Error during reset:", error);
    try {
      await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (e) {}
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .then(() => {
    console.log("🎉 Reset script finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Reset script execution failed:", error);
    process.exit(1);
  });
