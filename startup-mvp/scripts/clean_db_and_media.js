const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const TABLES_TO_CLEAN = [
  // Purchase & Vendor Returns
  'PurchaseItem',
  'Purchase',
  'ReturnToVendorItem',
  'ReturnToVendor',

  // Sales & POS
  'SaleItem',
  'Sale',
  'Coupon',
  'POSCashDenomination',
  'POSClosingCollection',
  'POSClosingSession',

  // GRN
  'GRNItem',
  'GRN',

  // Client Data
  'ClientAddress',
  'ClientItemDiscount',
  'Client',
  'MembershipTier',

  // Supplier Data
  'Supplier',

  // Products, Inventory & Catalog
  'StockLedger',
  'Stock',
  'InventoryAdjustmentItem',
  'InventoryAdjustment',
  'InventoryCountEntry',
  'InventoryAddStockEntry',
  'RFIDBundleScan',
  'ProductionBundle',
  'CuttingJobFabricRoll',
  'FabricRoll',
  'GarmentOperation',
  'IndustrialEngineeringBreakdown',
  'CMTCostBreakdown',
  'WashingJob',
  'SewingLineTrack',
  'CuttingJob',
  'GarmentProductionStage',
  'ProductionOrder',
  'BOMItem',
  'BOM',
  'ProductVariant',
  'Item',
  'Category',
  'Brand',
  'Unit',
  'Season',
  'Collection',
  'Fabric',

  // Damages
  'InventoryDamageItem',
  'InventoryDamage',

  // TPN
  'TransferPurchaseNoteItem',
  'TransferPurchaseNote',

  // Financial Ledgers & Vouchers
  'VoucherLine',
  'Voucher',
  'JournalEntryLine',
  'JournalEntry',

  // Attendance & Payroll Operational Data
  'Attendance',
  'AttendanceLog',
  'Overtime',
  'LeaveApplication',
  'Resignation',
  'EmployeeLoan',
  'PayrollItem',
  'Payroll',
  'EmployeeFine',
  'EmployeeBonus',
  'BiometricSyncLog',
  'BiometricRawLog',
  'UnmappedBiometricLog',
  'BiometricCommand',

  // Notifications & Activity Logs
  'Notification',
  'UserLog',

  // Files DB Records
  'File'
];

const TABLES_TO_KEEP = [
  'User',
  'Account',
  'Session',
  'VerificationToken',
  'PasswordReset',
  'Settings',
  'PermissionTemplate',
  'UserPermission',
  'ModuleOperation',
  'ChartOfAccount',
  'CashBankAccount',
  'AccountingPeriod',
  'Organization',
  'Warehouse',
  'Department',
  'Designation',
  'Floor',
  'Line',
  'Shift',
  'Holiday',
  'LeaveType',
  'EmployeeType',
  'BiometricDevice',
  'EmployeeDeviceMap',
  'SalaryStructurePolicy',
  'AttendancePolicy',
  'LatePolicy',
  'OvertimePolicy',
  'TiffinBillPolicy',
  'NightBillPolicy',
  'HolidayBillPolicy',
  'PayrollSetting',
  'Employee'
];

function cleanDirectoryContents(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let deletedCount = 0;
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (item === '.gitkeep' || item === '.DS_Store') continue;
    const itemPath = path.join(dirPath, item);
    try {
      fs.rmSync(itemPath, { recursive: true, force: true });
      deletedCount++;
    } catch (err) {
      console.warn(`Could not delete ${itemPath}: ${err.message}`);
    }
  }
  return deletedCount;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Starting Database & Media Files Cleanup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Audit counts before cleanup
  console.log('📊 Pre-cleanup audit...');
  let totalRowsToCleanBefore = 0;
  for (const table of TABLES_TO_CLEAN) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const count = result[0]?.count || 0;
      if (count > 0) {
        console.log(`  - ${table}: ${count} rows`);
        totalRowsToCleanBefore += count;
      }
    } catch (err) {
      // Table might not exist or error
    }
  }
  console.log(`\nTotal target rows to clean: ${totalRowsToCleanBefore}\n`);

  // 2. Truncate target tables using raw SQL CASCADE
  console.log('⚡ Truncating target tables...');
  for (const table of TABLES_TO_CLEAN) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`  ✅ Truncated "${table}"`);
    } catch (err) {
      console.warn(`  ⚠️ Could not truncate "${table}": ${err.message}`);
    }
  }

  // 3. Clean physical upload directories
  console.log('\n📁 Cleaning physical upload files...');
  const uploadDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../../volumes/uploads')
  ];
  for (const dir of uploadDirs) {
    const deleted = cleanDirectoryContents(dir);
    console.log(`  ✅ Cleaned ${deleted} file(s)/folder(s) from ${dir}`);
  }

  // 4. Verify post-cleanup audit
  console.log('\n🔍 Post-cleanup verification...');
  let totalRowsToCleanAfter = 0;
  for (const table of TABLES_TO_CLEAN) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const count = result[0]?.count || 0;
      if (count > 0) {
        console.error(`  ❌ WARNING: ${table} still has ${count} rows!`);
        totalRowsToCleanAfter += count;
      }
    } catch (err) {
      // Table error or empty
    }
  }

  if (totalRowsToCleanAfter === 0) {
    console.log('\n  ✅ SUCCESS: All target operational tables are completely empty (0 rows)!');
  } else {
    console.warn(`\n  ⚠️ ${totalRowsToCleanAfter} rows remain in target tables.`);
  }

  console.log('\n🛡️ Checking preserved system & accounts data...');
  for (const table of TABLES_TO_KEEP) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const count = result[0]?.count || 0;
      console.log(`  - Preserved table "${table}": ${count} rows`);
    } catch (err) {
      // Table error
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Cleanup Finished Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Fatal cleanup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
