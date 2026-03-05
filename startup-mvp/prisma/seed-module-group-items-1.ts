import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Helper functions
function parseDate(dateStr: string | null): Date {
  if (!dateStr || dateStr === "\\N" || dateStr.trim() === "") {
    return new Date();
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
}

function parseDecimal(value: string | null): Prisma.Decimal | null {
  if (!value || value === "\\N" || value.trim() === "") return null;
  return new Prisma.Decimal(value);
}

function parseString(value: string | null): string | null {
  if (!value || value === "\\N" || value.trim() === "") return null;
  return value;
}

function parseIntSafe(value: string | null): number {
  if (!value || value === "\\N" || value.trim() === "") return 0;
  return parseInt(value, 10);
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Module Group Items (Chunk 1/4)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmjal32xa00aso00190721xel",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("20000.01"),
        amount: parseDecimal("100000.04"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjal32xa00aro001nm115n60",
        createdAt: parseDate("2025-12-17 22:29:11.95"),
        updatedAt: parseDate("2025-12-17 22:29:11.95"),
      },
      {
        id: "cmjal40fd00azo001s1tpcvyt",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("20000.01"),
        amount: parseDecimal("100000.04"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjal40fd00ayo001os0qn395",
        createdAt: parseDate("2025-12-17 22:29:55.369"),
        updatedAt: parseDate("2025-12-17 22:29:55.369"),
      },
      {
        id: "cmjal5pew00b6o001clsp3d0i",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("1858.06"),
        amount: parseDecimal("9290.30"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjal5pew00b5o001yo0ve8cn",
        createdAt: parseDate("2025-12-17 22:31:14.408"),
        updatedAt: parseDate("2025-12-17 22:31:14.408"),
      },
      {
        id: "cmjal7j2e00bdo001kgehijyp",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("1858.06"),
        amount: parseDecimal("9290.30"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjal7j2e00bco0013eo5p8b7",
        createdAt: parseDate("2025-12-17 22:32:39.494"),
        updatedAt: parseDate("2025-12-17 22:32:39.494"),
      },
      {
        id: "cmjal9c5a00bko001yf0rcoxz",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("1858.06"),
        amount: parseDecimal("9290.30"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjal9c5a00bjo00148a17ts8",
        createdAt: parseDate("2025-12-17 22:34:03.838"),
        updatedAt: parseDate("2025-12-17 22:34:03.838"),
      },
      {
        id: "cmjalh37z00cxo0012s4kzzl7",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.22"),
        amount: parseDecimal("1.08"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalh37z00cwo001fjo3bw5e",
        createdAt: parseDate("2025-12-17 22:40:05.519"),
        updatedAt: parseDate("2025-12-17 22:40:05.519"),
      },
      {
        id: "cmjalhl2o00d4o001ns4ujja6",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalhl2o00d3o001dqahsrx6",
        createdAt: parseDate("2025-12-17 22:40:28.656"),
        updatedAt: parseDate("2025-12-17 22:40:28.656"),
      },
      {
        id: "cmjali23b00dbo001jyw77fos",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjali23b00dao00158m7brvb",
        createdAt: parseDate("2025-12-17 22:40:50.711"),
        updatedAt: parseDate("2025-12-17 22:40:50.711"),
      },
      {
        id: "cmjalihz700dio0017tdbzsue",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalihz700dho001yme9dnfb",
        createdAt: parseDate("2025-12-17 22:41:11.299"),
        updatedAt: parseDate("2025-12-17 22:41:11.299"),
      },
      {
        id: "cmjalizk700dpo001c6hny5zr",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalizk700doo001fuef5e2q",
        createdAt: parseDate("2025-12-17 22:41:34.087"),
        updatedAt: parseDate("2025-12-17 22:41:34.087"),
      },
      {
        id: "cmjaljkqi00dwo001li2cnt4d",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjaljkqi00dvo0013c7pt03d",
        createdAt: parseDate("2025-12-17 22:42:01.53"),
        updatedAt: parseDate("2025-12-17 22:42:01.53"),
      },
      {
        id: "cmjalkmr700e3o001iss3ebjl",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalkmr700e2o001dujxz9nk",
        createdAt: parseDate("2025-12-17 22:42:50.803"),
        updatedAt: parseDate("2025-12-17 22:42:50.803"),
      },
      {
        id: "cmjallc1e00eao001qhm79m9u",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("20000.01"),
        amount: parseDecimal("20000.01"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjallc1e00e9o001p5dnrq2c",
        createdAt: parseDate("2025-12-17 22:43:23.57"),
        updatedAt: parseDate("2025-12-17 22:43:23.57"),
      },
      {
        id: "cmjalm0ob00eho001wifigb4d",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalm0ob00ego00167fktogc",
        createdAt: parseDate("2025-12-17 22:43:55.499"),
        updatedAt: parseDate("2025-12-17 22:43:55.499"),
      },
      {
        id: "cmjalmyoe00eoo0017n10ilvw",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("20000.01"),
        amount: parseDecimal("20000.01"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalmyod00eno0016w66t11s",
        createdAt: parseDate("2025-12-17 22:44:39.566"),
        updatedAt: parseDate("2025-12-17 22:44:39.566"),
      },
      {
        id: "cmjalnsr000evo001cdssng72",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("20000.01"),
        amount: parseDecimal("20000.01"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalnsr000euo001ngdjfh3r",
        createdAt: parseDate("2025-12-17 22:45:18.54"),
        updatedAt: parseDate("2025-12-17 22:45:18.54"),
      },
      {
        id: "cmjalop3k00f2o001s7b7pm1f",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("1858.06"),
        amount: parseDecimal("1858.06"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalop3j00f1o001cmmdprf2",
        createdAt: parseDate("2025-12-17 22:46:00.464"),
        updatedAt: parseDate("2025-12-17 22:46:00.464"),
      },
      {
        id: "cmjalphuj00f9o001ze3k527w",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalphuj00f8o001by22akma",
        createdAt: parseDate("2025-12-17 22:46:37.723"),
        updatedAt: parseDate("2025-12-17 22:46:37.723"),
      },
      {
        id: "cmjalq37x00fgo001567opnr9",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalq37x00ffo0016s96se8t",
        createdAt: parseDate("2025-12-17 22:47:05.421"),
        updatedAt: parseDate("2025-12-17 22:47:05.421"),
      },
      {
        id: "cmjalqtt700fno001pfo2web7",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("20000.01"),
        amount: parseDecimal("20000.01"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalqtt600fmo001jollthav",
        createdAt: parseDate("2025-12-17 22:47:39.883"),
        updatedAt: parseDate("2025-12-17 22:47:39.883"),
      },
      {
        id: "cmjalrk1500fuo001b82k5pq3",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.00"),
        amount: parseDecimal("0.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalrk1500fto001jvz37gu1",
        createdAt: parseDate("2025-12-17 22:48:13.865"),
        updatedAt: parseDate("2025-12-17 22:48:13.865"),
      },
      {
        id: "cmjal0vl7008uo0011zjl3f35",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("10470.00"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl7008vo001r89zj6tt",
        sl: 2,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("14100.00"),
        sortOrder: 1,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl7008wo001n5aizjw0",
        sl: 3,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("17730.00"),
        sortOrder: 2,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl7008xo001i62cgj1w",
        sl: 4,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("21360.00"),
        sortOrder: 3,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl7008yo0010kown92h",
        sl: 5,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("24990.00"),
        sortOrder: 4,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl7008zo001bqt647zj",
        sl: 6,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("28620.00"),
        sortOrder: 5,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl70090o001wtfqgovu",
        sl: 7,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("32250.00"),
        sortOrder: 6,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl70091o001tvpa3tgw",
        sl: 8,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("35880.00"),
        sortOrder: 7,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
    ];

    for (const item of items) {
      await prisma.moduleGroupItem.upsert({
        where: { id: item.id },
        update: {
          sl: item.sl,
          itemId: item.itemId,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
          quantity: item.quantity,
          updatedAt: item.updatedAt,
        },
        create: item,
      });
      console.log(`✅ Upserted item: ${item.id}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ SUCCESS: Seeded ${items.length} module group items (Chunk 1/4)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("💥 Fatal error details:", e);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

