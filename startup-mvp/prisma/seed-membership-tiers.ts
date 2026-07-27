import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedMembershipTiers() {
  console.log("🌱 Seeding membership tiers...");

  const admin = await prisma.user.findFirst({
    where: { role: "admin" }
  });

  if (!admin) {
    console.error("No admin user found to associate as creator for membership tiers.");
    return;
  }

  const tiers = [
    { name: "NONE", minPurchaseValue: 0.00, discountPercentage: 0.00 },
    { name: "BRONZE", minPurchaseValue: 1000.00, discountPercentage: 2.00 },
    { name: "SILVER", minPurchaseValue: 2000.00, discountPercentage: 5.00 },
    { name: "GOLD", minPurchaseValue: 5000.00, discountPercentage: 10.00 },
    { name: "PLATINUM", minPurchaseValue: 10000.00, discountPercentage: 15.00 }
  ];

  for (const tier of tiers) {
    await prisma.membershipTier.upsert({
      where: { name: tier.name },
      update: {
        minPurchaseValue: tier.minPurchaseValue,
        discountPercentage: tier.discountPercentage,
        status: "active"
      },
      create: {
        name: tier.name,
        minPurchaseValue: tier.minPurchaseValue,
        discountPercentage: tier.discountPercentage,
        status: "active",
        createdBy: admin.id
      }
    });
    console.log(`✅ Upserted MembershipTier: ${tier.name}`);
  }
}

async function run() {
  await seedMembershipTiers();
}

if (require.main === module) {
  run()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
