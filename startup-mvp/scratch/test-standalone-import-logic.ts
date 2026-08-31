import { prisma } from "../lib/prisma";
import { ItemType } from "@prisma/client";

async function testItemProcessingLogic() {
  console.log("🧪 Testing item import database insertion and mapping logic...");

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in DB");
    return;
  }

  const firstUnit = await prisma.unit.findFirst();
  const unitId = firstUnit?.id || (await prisma.unit.create({ data: { details: "Pieces", symbol: "PCS", createdBy: user.id } })).id;

  const testRows = [
    {
      name: "Test Polo Shirt Standard",
      code: "POLO-1001",
      itemType: "Ready Product",
      salesPrice: "500",
      costPrice: "250",
      barcode: "8941000000001",
    },
    {
      name: "Test Polo Shirt Auto Code",
      code: "", // Should auto generate ITM-XXXXXX
      itemType: "raw_material",
      salesPrice: "300",
      costPrice: "150",
      barcode: "8941000000002",
    },
  ];

  for (const row of testRows) {
    let parsedItemType: ItemType = ItemType.READY_PRODUCT;
    if (row.itemType) {
      const rawType = String(row.itemType).toUpperCase().trim().replace(/[-\s]+/g, "_");
      if (Object.values(ItemType).includes(rawType as ItemType)) {
        parsedItemType = rawType as ItemType;
      }
    }

    const codeVal = row.code !== undefined && row.code !== null && String(row.code).trim() !== "" ? String(row.code).trim() : null;
    const barcodeVal = row.barcode !== undefined && row.barcode !== null && String(row.barcode).trim() !== "" ? String(row.barcode).trim() : null;

    const finalCode = codeVal || `ITM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const created = await prisma.item.create({
      data: {
        name: String(row.name).trim(),
        code: finalCode,
        barcode: barcodeVal,
        salesPrice: row.salesPrice ? Number(row.salesPrice) : 0,
        costPrice: row.costPrice ? Number(row.costPrice) : 0,
        status: "active",
        itemType: parsedItemType,
        unitId,
        createdBy: user.id,
      },
    });

    console.log("Successfully created item:", {
      id: created.id,
      name: created.name,
      code: created.code,
      barcode: created.barcode,
      itemType: created.itemType,
      salesPrice: created.salesPrice?.toString(),
    });
  }

  // Cleanup test items
  await prisma.item.deleteMany({ where: { name: { startsWith: "Test Polo Shirt" } } });
  console.log("✅ Cleaned up test items successfully.");
}

testItemProcessingLogic()
  .catch((err) => console.error("Test failed:", err))
  .finally(() => prisma.$disconnect());
