import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding orphaned ProductVariants...');

  // Get all valid Item IDs
  const validItems = await prisma.item.findMany({ select: { id: true } });
  const validItemIds = new Set(validItems.map((i) => i.id));

  // Get all ProductVariants
  const allVariants = await prisma.productVariant.findMany();

  // Filter for orphaned variants
  const orphanedVariants = allVariants.filter((v) => !validItemIds.has(v.itemId));

  console.log(`Found ${orphanedVariants.length} orphaned variants.`);

  if (orphanedVariants.length > 0) {
    console.log('Creating a dummy Legacy Item...');
    
    // We need to fetch an active Unit and Category to create an item, or we can just mock some data
    const unit = await prisma.unit.findFirst();
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } }) || await prisma.user.findFirst();

    if (!unit || !adminUser) {
      console.log('Could not find a Unit or User to create the legacy item. Please create them first or adjust the script.');
      return;
    }

    const legacyItem = await prisma.item.create({
      data: {
        code: 'LEGACY-RECOVERED-ITEM',
        name: 'Recovered Legacy Item',
        description: 'This item holds product variants that lost their original item relation.',
        itemType: 'READY_PRODUCT',
        costPrice: 0,
        trackInventory: false,
        isTrash: false,
        createdBy: adminUser.id,
        unitId: unit.id,
      },
    });

    console.log(`Created Legacy Item with ID: ${legacyItem.id}`);

    const orphanedIds = orphanedVariants.map((v) => v.id);

    // Update orphaned variants to point to the legacy item
    const updateResult = await prisma.productVariant.updateMany({
      where: { id: { in: orphanedIds } },
      data: { itemId: legacyItem.id },
    });

    console.log(`Updated ${updateResult.count} invalid ProductVariants successfully.`);
  } else {
    console.log('No orphaned variants found.');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
