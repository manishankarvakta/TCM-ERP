import { parseAndValidateCsvAction, executeImportAction } from "../app/(dashboard)/dashboard/import/_actions/import.action";
import { prisma } from "../lib/prisma";

async function testProductImport() {
  console.log("🧪 Testing complete product import pipeline...");

  // Sample CSV data with various formats: custom code, empty code, barcode, spaces in itemType
  const rawCsvRows = [
    {
      "Item Name": "Test Polo Shirt 1",
      "Item Code / SKU": "TST-POLO-001",
      "Item Type": "Ready Product",
      "Sales Price": "500",
      "Purchase / Cost Price": "250",
      "Barcode / EAN": "8941000000001",
    },
    {
      "Item Name": "Test Polo Shirt 2",
      "Item Code / SKU": "", // Empty code -> should auto generate ITM-XXXXXX
      "Item Type": "raw_material",
      "Sales Price": "300",
      "Purchase / Cost Price": "150",
      "Barcode / EAN": "8941000000002",
    },
    {
      "Item Name": "Test Retail Shirt 3",
      "Item Code / SKU": "TST-RETAIL-003",
      "Item Type": "RETAIL",
      "Sales Price": "750",
      "Purchase / Cost Price": "400",
      "Barcode / EAN": "",
    },
  ];

  const fieldMapping = {
    name: "Item Name",
    code: "Item Code / SKU",
    itemType: "Item Type",
    salesPrice: "Sales Price",
    costPrice: "Purchase / Cost Price",
    barcode: "Barcode / EAN",
  };

  console.log("1. Parsing and validating rows...");
  const valRes = await parseAndValidateCsvAction("Products", rawCsvRows, fieldMapping);
  console.log("Validation result summary:", {
    success: valRes.success,
    totalRows: valRes.summary?.totalRows,
    validRowsCount: valRes.summary?.validRowsCount,
    invalidRowsCount: valRes.summary?.invalidRowsCount,
    unmappedRequiredFields: valRes.summary?.unmappedRequiredFields,
  });

  if (valRes.summary?.rows && valRes.summary.rows.length > 0) {
    console.log("Sample mapped row 1 data:", valRes.summary.rows[0].data);
    console.log("Sample mapped row 1 errors:", valRes.summary.rows[0].errors);
  }

  if (valRes.success && valRes.summary && valRes.summary.validRowsCount > 0) {
    const mappedValidData = valRes.summary.rows
      .filter((r) => r.isValid)
      .map((r) => r.data);

    console.log("2. Executing batch import...");
    const execRes = await executeImportAction("Products", mappedValidData, "skip");
    console.log("Execution result:", execRes);

    const insertedItems = await prisma.item.findMany({
      where: { name: { startsWith: "Test " } },
      select: { id: true, name: true, code: true, barcode: true, itemType: true, salesPrice: true },
    });
    console.log("Created items in DB:", JSON.stringify(insertedItems, null, 2));

    // Cleanup test items
    await prisma.item.deleteMany({ where: { name: { startsWith: "Test " } } });
    console.log("Cleaned up test items.");
  }
}

testProductImport()
  .catch((err) => console.error("Test failed:", err))
  .finally(() => prisma.$disconnect());
