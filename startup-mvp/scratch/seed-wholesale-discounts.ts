import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find a user to act as creator
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in the database. Please seed users first.");
    return;
  }

  // Find some items and variants
  const items = await prisma.item.findMany({
    take: 5,
    include: {
      variants: true,
    },
  });

  if (items.length === 0) {
    console.error("No items found in the database. Please seed items first.");
    return;
  }

  // 1. Upsert a Wholesale Client
  const clientEmail = "wholesale@apex.com";
  const client = await prisma.client.upsert({
    where: { email: clientEmail },
    update: {
      name: "Apex Wholesale Ltd",
      company: "Apex Wholesale Ltd",
      clientCode: "CLI-WS-001",
      status: "active",
    },
    create: {
      name: "Apex Wholesale Ltd",
      email: clientEmail,
      company: "Apex Wholesale Ltd",
      clientCode: "CLI-WS-001",
      status: "active",
      createdBy: user.id,
    },
  });

  console.log(`✅ Upserted Client: ${client.name} (ID: ${client.id}, Code: ${client.clientCode})`);

  // Clear existing discounts for this client to prevent duplication
  await prisma.clientItemDiscount.deleteMany({
    where: { clientId: client.id },
  });

  // 2. Set up item-level discount: flat 50 Off for the first item
  const item1 = items[0];
  const discount1 = await prisma.clientItemDiscount.create({
    data: {
      clientId: client.id,
      itemId: item1.id,
      discountType: "FLAT",
      discountValue: 50.00,
    },
  });
  console.log(`✅ Created discount for Item: ${item1.name} (${item1.code}) - Flat 50.00 Off`);

  // 3. Set up variant-level discount: 15% Off for the first variant of the second item (if it has one)
  const itemWithVariant = items.find(it => it.variants && it.variants.length > 0);
  if (itemWithVariant && itemWithVariant.variants.length > 0) {
    const variant = itemWithVariant.variants[0];
    const discount2 = await prisma.clientItemDiscount.create({
      data: {
        clientId: client.id,
        itemId: itemWithVariant.id,
        variantId: variant.id,
        discountType: "PERCENTAGE",
        discountValue: 15.00,
      },
    });
    console.log(`✅ Created discount for Variant SKU: ${variant.sku} (Item: ${itemWithVariant.name}) - 15% Off`);
  } else {
    // If no variant exists, create a percentage discount of 10% on the second item
    const item2 = items[1] || items[0];
    const discount2 = await prisma.clientItemDiscount.create({
      data: {
        clientId: client.id,
        itemId: item2.id,
        discountType: "PERCENTAGE",
        discountValue: 10.00,
      },
    });
    console.log(`✅ Created discount for Item: ${item2.name} (${item2.code}) - 10% Off`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
