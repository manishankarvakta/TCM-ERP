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

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Module Group Items (Chunk 4/4)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmjal0vl900a4o001ts3klwrg",
        sl: 47,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("37680.00"),
        sortOrder: 46,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900a5o0018e9w2gkh",
        sl: 48,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("41760.00"),
        sortOrder: 47,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900a6o001naas2ttq",
        sl: 49,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("15784.40"),
        sortOrder: 48,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900a7o0010025ezne",
        sl: 50,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("20290.40"),
        sortOrder: 49,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900a8o001u2re1jmv",
        sl: 51,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("24796.40"),
        sortOrder: 50,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900a9o001wyamc3uo",
        sl: 52,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("29302.40"),
        sortOrder: 51,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900aao001fwxm7qi1",
        sl: 53,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("33808.40"),
        sortOrder: 52,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900abo001jv4xn6q1",
        sl: 54,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("38314.40"),
        sortOrder: 53,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900aco001xug11pn4",
        sl: 55,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("42820.40"),
        sortOrder: 54,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900ado001u81z20u3",
        sl: 56,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("47326.40"),
        sortOrder: 55,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900aeo0014qmq278k",
        sl: 57,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("18660.00"),
        sortOrder: 56,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900afo00199cv9zxi",
        sl: 58,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("23640.00"),
        sortOrder: 57,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900ago0018iqrc61x",
        sl: 59,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("28620.00"),
        sortOrder: 58,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900aho001ufdlqvio",
        sl: 60,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("33600.00"),
        sortOrder: 59,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900aio0018nbfljjd",
        sl: 61,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("38580.00"),
        sortOrder: 60,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900ajo001y05nkf57",
        sl: 62,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("43560.00"),
        sortOrder: 61,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900ako0012wh8912m",
        sl: 63,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("48540.00"),
        sortOrder: 62,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjal0vl900alo001wyln2ncv",
        sl: 64,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.02"),
        amount: parseDecimal("53520.00"),
        sortOrder: 63,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjakvk86007lo0018wtl4lbh",
        createdAt: parseDate("2025-12-17 22:27:29.13"),
        updatedAt: parseDate("2025-12-17 22:27:29.13"),
      },
      {
        id: "cmjaladv000bro001igfg0e2i",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("1858.06"),
        amount: parseDecimal("9290.30"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjaladv000bqo0016jywzh3n",
        createdAt: parseDate("2025-12-17 22:34:52.716"),
        updatedAt: parseDate("2025-12-17 22:34:52.716"),
      },
      {
        id: "cmjalbesw00byo001go3e6n2j",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.22"),
        amount: parseDecimal("1.08"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalbesw00bxo001dprc4ao4",
        createdAt: parseDate("2025-12-17 22:35:40.592"),
        updatedAt: parseDate("2025-12-17 22:35:40.592"),
      },
      {
        id: "cmjalch9e00c5o001q9htvzkk",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.22"),
        amount: parseDecimal("1.08"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalch9e00c4o001pw1fh9zr",
        createdAt: parseDate("2025-12-17 22:36:30.435"),
        updatedAt: parseDate("2025-12-17 22:36:30.435"),
      },
      {
        id: "cmjaldr4i00cco001b2im3dzl",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.22"),
        amount: parseDecimal("1.08"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjaldr4i00cbo0012pwuwd3b",
        createdAt: parseDate("2025-12-17 22:37:29.875"),
        updatedAt: parseDate("2025-12-17 22:37:29.875"),
      },
      {
        id: "cmjalejms00cjo001b2f04zg0",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.22"),
        amount: parseDecimal("1.08"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalejmr00cio001lcb45gps",
        createdAt: parseDate("2025-12-17 22:38:06.82"),
        updatedAt: parseDate("2025-12-17 22:38:06.82"),
      },
      {
        id: "cmjalfg4k00cqo001ka84fi9b",
        sl: 1,
        itemId: "cm1placeholderItem",
        unitPrice: parseDecimal("0.22"),
        amount: parseDecimal("1.08"),
        sortOrder: 0,
        quantity: new Prisma.Decimal("1"),
        moduleGroupId: "cmjalfg4k00cpo001bb3xpq4n",
        createdAt: parseDate("2025-12-17 22:38:48.932"),
        updatedAt: parseDate("2025-12-17 22:38:48.932"),
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
    console.log(`✅ SUCCESS: Seeded ${items.length} module group items (Chunk 4/4)`);
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

