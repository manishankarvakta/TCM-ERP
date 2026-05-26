/**
 * Garment Items Seed Script
 *
 * Seeds retail and wholesale products for: Shirt, Pant, T-Shirt, Polo, Jeans categories.
 * Run this AFTER seed-garment-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Multiple Garment Items (Shirt, Pant, T-Shirt, Polo, Jeans)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 1. Resolve admin user ──────────────────────────────────────────────────
  const creator =
    (await prisma.user.findFirst({
      where: { role: "admin", status: "active" },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.user.findFirst({
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!creator) {
    throw new Error(
      "No users found. Please create an admin user first before seeding items."
    );
  }
  console.log(`\n👤 Using creator: ${creator.email ?? creator.id}`);

  // ── 2. Resolve units ───────────────────────────────────────────────────────
  const unitPc = await prisma.unit.findFirst({ where: { symbol: "pc" } });
  if (!unitPc) {
    throw new Error("Required unit 'pc' not found. Please run the units seed first.");
  }

  // ── 3. Resolve categories ──────────────────────────────────────────────────
  const getCategoryId = async (name: string): Promise<string | null> => {
    const cat = await prisma.category.findFirst({ where: { name } });
    return cat?.id ?? null;
  };

  const catShirt = await getCategoryId("Shirt");
  const catPant = await getCategoryId("Pant");
  const catTShirt = await getCategoryId("T-Shirt");
  const catPolo = await getCategoryId("Polo");
  const catJeans = await getCategoryId("Jeans");

  console.log("\n📋 Categories resolved:");
  console.log(`   Shirt: ${catShirt ?? "❌ NOT FOUND"}`);
  console.log(`   Pant: ${catPant ?? "❌ NOT FOUND"}`);
  console.log(`   T-Shirt: ${catTShirt ?? "❌ NOT FOUND"}`);
  console.log(`   Polo: ${catPolo ?? "❌ NOT FOUND"}`);
  console.log(`   Jeans: ${catJeans ?? "❌ NOT FOUND"}`);

  if (!catShirt || !catPant || !catTShirt || !catPolo || !catJeans) {
    throw new Error("Required categories (Shirt, Pant, T-Shirt, Polo, Jeans) not resolved properly.");
  }

  // ── 4. Item definitions (Retail & Wholesale, multiple per category)
  const items = [
    // ── SHIRTS ──
    {
      code: "GM-SH-001-R",
      name: "Cotton Casual Shirt (Retail)",
      description: "Premium cotton regular fit casual shirt - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catShirt,
      costPrice: "350",
      salesPrice: "650",
      wholesalePrice: "500",
      colors: ["White", "Blue", "Black"],
      sizes: ["M", "L", "XL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-SH-001-W",
      name: "Cotton Casual Shirt (Wholesale)",
      description: "Premium cotton regular fit casual shirt - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catShirt,
      costPrice: "280",
      salesPrice: "480",
      wholesalePrice: "480",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-SH-002-R",
      name: "Oxford Formal Shirt (Retail)",
      description: "Premium oxford cotton formal dress shirt - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catShirt,
      costPrice: "420",
      salesPrice: "790",
      wholesalePrice: "600",
      colors: ["Light Blue", "Pink", "White"],
      sizes: ["S", "M", "L", "XL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-SH-002-W",
      name: "Oxford Formal Shirt (Wholesale)",
      description: "Premium oxford cotton formal dress shirt - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catShirt,
      costPrice: "330",
      salesPrice: "550",
      wholesalePrice: "550",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-SH-003-R",
      name: "Flannel Checked Shirt (Retail)",
      description: "Soft flannel checked shirt for casual wear - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catShirt,
      costPrice: "380",
      salesPrice: "690",
      wholesalePrice: "530",
      colors: ["Red-Black", "Green-Black"],
      sizes: ["M", "L", "XL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-SH-003-W",
      name: "Flannel Checked Shirt (Wholesale)",
      description: "Soft flannel checked shirt for casual wear - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catShirt,
      costPrice: "300",
      salesPrice: "500",
      wholesalePrice: "500",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },

    // ── PANTS ──
    {
      code: "GM-PA-001-R",
      name: "Slim Fit Chino Pant (Retail)",
      description: "Comfort stretch chino pants - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catPant,
      costPrice: "450",
      salesPrice: "850",
      wholesalePrice: "650",
      colors: ["Khaki", "Navy", "Black"],
      sizes: ["30", "32", "34"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-PA-001-W",
      name: "Slim Fit Chino Pant (Wholesale)",
      description: "Comfort stretch chino pants - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catPant,
      costPrice: "380",
      salesPrice: "580",
      wholesalePrice: "580",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-PA-002-R",
      name: "Formal Dress Trouser (Retail)",
      description: "Premium formal dress trousers - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catPant,
      costPrice: "480",
      salesPrice: "890",
      wholesalePrice: "700",
      colors: ["Charcoal", "Black", "Grey"],
      sizes: ["30", "32", "34", "36"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-PA-002-W",
      name: "Formal Dress Trouser (Wholesale)",
      description: "Premium formal dress trousers - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catPant,
      costPrice: "400",
      salesPrice: "620",
      wholesalePrice: "620",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },

    // ── T-SHIRTS ──
    {
      code: "GM-TS-001-R",
      name: "Round Neck Cotton T-Shirt (Retail)",
      description: "100% cotton crewneck basic t-shirt - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catTShirt,
      costPrice: "180",
      salesPrice: "350",
      wholesalePrice: "250",
      colors: ["Black", "Red", "Grey"],
      sizes: ["M", "L", "XL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-TS-001-W",
      name: "Round Neck Cotton T-Shirt (Wholesale)",
      description: "100% cotton crewneck basic t-shirt - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catTShirt,
      costPrice: "130",
      salesPrice: "220",
      wholesalePrice: "220",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-TS-002-R",
      name: "V-Neck Graphic T-Shirt (Retail)",
      description: "V-neck cotton t-shirt with print design - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catTShirt,
      costPrice: "200",
      salesPrice: "390",
      wholesalePrice: "280",
      colors: ["White", "Navy", "Yellow"],
      sizes: ["S", "M", "L", "XL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-TS-002-W",
      name: "V-Neck Graphic T-Shirt (Wholesale)",
      description: "V-neck cotton t-shirt with print design - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catTShirt,
      costPrice: "150",
      salesPrice: "250",
      wholesalePrice: "250",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },

    // ── POLOS ──
    {
      code: "GM-PO-001-R",
      name: "Classic Pique Polo (Retail)",
      description: "Premium cotton pique knit polo shirt - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catPolo,
      costPrice: "280",
      salesPrice: "550",
      wholesalePrice: "400",
      colors: ["Navy", "White", "Green"],
      sizes: ["M", "L", "XL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-PO-001-W",
      name: "Classic Pique Polo (Wholesale)",
      description: "Premium cotton pique knit polo shirt - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catPolo,
      costPrice: "210",
      salesPrice: "350",
      wholesalePrice: "350",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-PO-002-R",
      name: "Striped Athletic Polo (Retail)",
      description: "Dry-fit polyester blend striped polo shirt - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catPolo,
      costPrice: "320",
      salesPrice: "590",
      wholesalePrice: "450",
      colors: ["Grey-White", "Navy-Red"],
      sizes: ["M", "L", "XL", "XXL"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-PO-002-W",
      name: "Striped Athletic Polo (Wholesale)",
      description: "Dry-fit polyester blend striped polo shirt - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catPolo,
      costPrice: "250",
      salesPrice: "400",
      wholesalePrice: "400",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },

    // ── JEANS ──
    {
      code: "GM-JE-001-R",
      name: "Stretch Denim Jeans (Retail)",
      description: "Classic 5-pocket slim fit stretch jeans - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catJeans,
      costPrice: "550",
      salesPrice: "1100",
      wholesalePrice: "850",
      colors: ["Dark Blue", "Black"],
      sizes: ["30", "32", "34", "36"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-JE-001-W",
      name: "Stretch Denim Jeans (Wholesale)",
      description: "Classic 5-pocket slim fit stretch jeans - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catJeans,
      costPrice: "450",
      salesPrice: "750",
      wholesalePrice: "750",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-JE-002-R",
      name: "Regular Fit Denim Jeans (Retail)",
      description: "Heavyweight 100% cotton regular fit jeans - Retail Pack",
      unitId: unitPc.id,
      itemType: "RETAIL" as const,
      categoryId: catJeans,
      costPrice: "500",
      salesPrice: "990",
      wholesalePrice: "780",
      colors: ["Light Blue", "Indigo"],
      sizes: ["30", "32", "34", "36"],
      trackInventory: true,
      status: "active",
    },
    {
      code: "GM-JE-002-W",
      name: "Regular Fit Denim Jeans (Wholesale)",
      description: "Heavyweight 100% cotton regular fit jeans - Wholesale Pack",
      unitId: unitPc.id,
      itemType: "WHOLESALE" as const,
      categoryId: catJeans,
      costPrice: "400",
      salesPrice: "680",
      wholesalePrice: "680",
      colors: [],
      sizes: [],
      trackInventory: true,
      status: "active",
    },
  ];

  // ── 4. Image mapping ───────────────────────────────────────────────────────
  const getImageUrl = (itemCode: string, color?: string): string => {
    const defaultImages: Record<string, string> = {
      shirt: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop",
      pant: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop",
      tshirt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop",
      polo: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop",
      jeans: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop"
    };

    const colorImages: Record<string, Record<string, string>> = {
      shirt: {
        white: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop",
        blue: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=500&auto=format&fit=crop",
        black: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop",
        pink: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop",
        lightblue: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop",
        redblack: "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=500&auto=format&fit=crop",
        greenblack: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&auto=format&fit=crop"
      },
      pant: {
        khaki: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop",
        navy: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop",
        black: "https://images.unsplash.com/photo-1506629082925-63d627072e23?w=500&auto=format&fit=crop",
        charcoal: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=500&auto=format&fit=crop",
        grey: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&auto=format&fit=crop"
      },
      tshirt: {
        black: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop",
        red: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&auto=format&fit=crop",
        grey: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop",
        white: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop",
        navy: "https://images.unsplash.com/photo-1503341455253-b2bc71f093f6?w=500&auto=format&fit=crop",
        yellow: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&auto=format&fit=crop"
      },
      polo: {
        navy: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop",
        white: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop",
        green: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&auto=format&fit=crop",
        greywhite: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop",
        navyred: "https://images.unsplash.com/photo-1503341455253-b2bc71f093f6?w=500&auto=format&fit=crop"
      },
      jeans: {
        darkblue: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop",
        black: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=500&auto=format&fit=crop",
        lightblue: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop",
        indigo: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop"
      }
    };

    let key = "shirt";
    if (itemCode.includes("-PA-")) key = "pant";
    else if (itemCode.includes("-TS-")) key = "tshirt";
    else if (itemCode.includes("-PO-")) key = "polo";
    else if (itemCode.includes("-JE-")) key = "jeans";

    if (color) {
      const cleanColor = color.toLowerCase().replace(/[^a-z]/g, "");
      if (colorImages[key]?.[cleanColor]) {
        return colorImages[key][cleanColor];
      }
    }
    return defaultImages[key];
  };

  // ── 5. Upsert items ────────────────────────────────────────────────────────
  console.log(`\n📦 Seeding ${items.length} garment items...\n`);
  let successCount = 0;
  let skipCount = 0;

  for (const item of items) {
    try {
      const barcodeValue = `BC-${item.code.replace(/[^a-zA-Z0-9]/g, "")}`;
      const featuredImage = getImageUrl(item.code);

      const createdOrUpdatedItem = await prisma.item.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          unitId: item.unitId,
          itemType: item.itemType,
          categoryId: item.categoryId,
          costPrice: item.costPrice,
          salesPrice: item.salesPrice,
          wholesalePrice: item.wholesalePrice ?? undefined,
          colors: item.itemType === "RETAIL" ? item.colors : [],
          sizes: item.itemType === "RETAIL" ? item.sizes : [],
          trackInventory: item.trackInventory,
          status: item.status,
          barcode: barcodeValue,
          featuredImage,
          images: [featuredImage],
        },
        create: {
          code: item.code,
          name: item.name,
          description: item.description,
          unitId: item.unitId,
          itemType: item.itemType,
          categoryId: item.categoryId,
          costPrice: item.costPrice,
          salesPrice: item.salesPrice,
          wholesalePrice: item.wholesalePrice ?? undefined,
          colors: item.itemType === "RETAIL" ? item.colors : [],
          sizes: item.itemType === "RETAIL" ? item.sizes : [],
          trackInventory: item.trackInventory,
          status: item.status,
          createdBy: creator.id,
          barcode: barcodeValue,
          featuredImage,
          images: [featuredImage],
        },
      });

      // Clear any existing variants if updating
      if (createdOrUpdatedItem.id) {
        await prisma.productVariant.deleteMany({
          where: { itemId: createdOrUpdatedItem.id }
        });
      }

      // Create variants ONLY for RETAIL products
      if (item.itemType === "RETAIL") {
        for (const color of item.colors) {
          for (const size of item.sizes) {
            const cleanColor = color.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const sku = `${item.code}-${cleanColor.substring(0, 4)}-${size}`;
            const variantBarcode = `BC-${sku.replace(/[^a-zA-Z0-9]/g, "")}`;
            const variantImage = getImageUrl(item.code, color);
            
            await prisma.productVariant.deleteMany({
              where: { sku }
            });

            await prisma.productVariant.create({
              data: {
                sku,
                color,
                size,
                itemId: createdOrUpdatedItem.id,
                costPrice: item.costPrice,
                salesPrice: item.salesPrice,
                barcode: variantBarcode,
                image: variantImage,
              }
            });
          }
        }
        console.log(`✅ [${item.code}] ${item.name} (with variations)`);
      } else {
        console.log(`✅ [${item.code}] ${item.name} (no variations)`);
      }
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to upsert [${item.code}] ${item.name}:`, err);
      skipCount++;
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ SUCCESS: ${successCount} items seeded, ${skipCount} skipped`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("💥 Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
