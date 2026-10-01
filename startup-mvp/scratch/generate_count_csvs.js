const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportCountCsv() {
  console.log('--- Fetching all Inventory Count Entries ---');

  const allCounts = await prisma.inventoryCountEntry.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      item: {
        select: {
          code: true,
          barcode: true,
          name: true,
          costPrice: true,
          salesPrice: true,
          unit: { select: { symbol: true } },
          category: { select: { name: true } }
        }
      },
      warehouse: {
        select: {
          name: true,
          code: true
        }
      },
      creator: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  console.log(`Total count entries fetched: ${allCounts.length}`);

  // Date threshold: 20 September 2026 23:59:59.999 Local / UTC
  // Let's inspect min and max date
  if (allCounts.length > 0) {
    console.log(`Earliest entry: ${allCounts[0].createdAt.toISOString()}`);
    console.log(`Latest entry: ${allCounts[allCounts.length - 1].createdAt.toISOString()}`);
  }

  // Split by Date: Till 20 Sept 2026 (<= 2026-09-20T23:59:59.999Z / local) and After 20 Sept (> 2026-09-20T23:59:59.999Z)
  // Let's check date string YYYY-MM-DD
  const till20Sept = [];
  const after20Sept = [];

  for (const entry of allCounts) {
    const d = new Date(entry.createdAt);
    // Convert to YYYY-MM-DD in local/stored date or check ISO date
    const dateStr = d.toISOString().split('T')[0];
    
    // Check if <= '2026-09-20'
    if (dateStr <= '2026-09-20') {
      till20Sept.push(entry);
    } else {
      after20Sept.push(entry);
    }
  }

  console.log(`\nEntries Till 20 Sept: ${till20Sept.length}`);
  console.log(`Entries After 20 Sept: ${after20Sept.length}`);

  // CSV Headers
  const headers = [
    'ID',
    'Date_Time',
    'Date_Only',
    'Barcode',
    'Item_Code',
    'Item_Name',
    'Category',
    'Unit',
    'Cost_Price',
    'Sales_Price',
    'Counted_Quantity',
    'Total_Cost_Value',
    'Warehouse_Name',
    'Warehouse_Code',
    'Status',
    'Counted_By_Name',
    'Counted_By_Email'
  ];

  function generateCsvContent(entries) {
    const rows = [headers.join(',')];

    for (const e of entries) {
      const costPrice = Number(e.item?.costPrice || 0);
      const salesPrice = Number(e.item?.salesPrice || 0);
      const qty = Number(e.quantity || 0);
      const totalCostValue = (qty * costPrice).toFixed(2);
      const dateStr = e.createdAt.toISOString();
      const dateOnly = dateStr.split('T')[0];

      const row = [
        escapeCsvField(e.id),
        escapeCsvField(dateStr),
        escapeCsvField(dateOnly),
        escapeCsvField(e.barcode || e.item?.barcode || ''),
        escapeCsvField(e.item?.code || ''),
        escapeCsvField(e.item?.name || ''),
        escapeCsvField(e.item?.category?.name || ''),
        escapeCsvField(e.item?.unit?.symbol || ''),
        escapeCsvField(costPrice.toFixed(2)),
        escapeCsvField(salesPrice.toFixed(2)),
        escapeCsvField(qty.toFixed(3)),
        escapeCsvField(totalCostValue),
        escapeCsvField(e.warehouse?.name || ''),
        escapeCsvField(e.warehouse?.code || ''),
        escapeCsvField(e.status),
        escapeCsvField(e.creator?.name || ''),
        escapeCsvField(e.creator?.email || '')
      ];
      rows.push(row.join(','));
    }
    return rows.join('\n');
  }

  const csvTill20 = generateCsvContent(till20Sept);
  const csvAfter20 = generateCsvContent(after20Sept);

  // Write files to public/downloads or workspace directory
  const outDir = path.join(__dirname, '../public/exports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const file1Path = path.join(outDir, 'inventory_count_till_20_sept.csv');
  const file2Path = path.join(outDir, 'inventory_count_after_20_sept.csv');

  fs.writeFileSync(file1Path, csvTill20, 'utf8');
  fs.writeFileSync(file2Path, csvAfter20, 'utf8');

  console.log(`\nGenerated CSV files:`);
  console.log(`1. ${file1Path} (${(fs.statSync(file1Path).size / 1024).toFixed(1)} KB)`);
  console.log(`2. ${file2Path} (${(fs.statSync(file2Path).size / 1024).toFixed(1)} KB)`);

  // Summarize metrics for each period
  function getMetrics(entries) {
    let totalQty = 0;
    let totalCostVal = 0;
    let totalSalesVal = 0;
    const uniqueItemMap = new Map();
    const userMap = new Map();
    const dateMap = new Map();

    for (const e of entries) {
      const qty = Number(e.quantity || 0);
      const cost = Number(e.item?.costPrice || 0);
      const sales = Number(e.item?.salesPrice || 0);

      totalQty += qty;
      totalCostVal += qty * cost;
      totalSalesVal += qty * sales;

      const itemKey = e.itemId;
      uniqueItemMap.set(itemKey, (uniqueItemMap.get(itemKey) || 0) + qty);

      const userName = e.creator?.name || 'Unknown';
      userMap.set(userName, (userMap.get(userName) || 0) + qty);

      const d = e.createdAt.toISOString().split('T')[0];
      dateMap.set(d, (dateMap.get(d) || 0) + 1);
    }

    return {
      entriesCount: entries.length,
      uniqueItemsCount: uniqueItemMap.size,
      totalQuantityCounted: totalQty.toFixed(3),
      totalCostValue: totalCostVal.toFixed(2),
      totalSalesValue: totalSalesVal.toFixed(2),
      byDate: Object.fromEntries(dateMap),
      byUser: Object.fromEntries(userMap)
    };
  }

  console.log('\n--- METRICS TILL 20 SEPT 2026 ---');
  console.log(JSON.stringify(getMetrics(till20Sept), null, 2));

  console.log('\n--- METRICS AFTER 20 SEPT 2026 ---');
  console.log(JSON.stringify(getMetrics(after20Sept), null, 2));

  await prisma.$disconnect();
}

exportCountCsv().catch(err => {
  console.error('Error generating CSVs:', err);
  process.exit(1);
});
