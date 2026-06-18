/**
 * Database Reset Script
 * 
 * This script deletes all data from the database EXCEPT:
 * - User records
 * - Organization records
 * 
 * It respects foreign key constraints by deleting in reverse dependency order.
 * 
 * Usage:
 *   npx tsx prisma/reset-db.ts
 * 
 * WARNING: This will permanently delete all data except Users and Organizations!
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗑️  Database Reset");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  WARNING: This will delete ALL data except Users and Organizations!");
  console.log("   Press Ctrl+C within 5 seconds to cancel...\n");

  // Wait 5 seconds for user to cancel
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    console.log("🔄 Starting database reset...\n");

    // Disable foreign key checks temporarily (PostgreSQL uses session_replication_role)
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

    // Delete in reverse dependency order (children first, then parents)
    // This ensures foreign key constraints don't block deletions

    console.log("📦 Deleting QuotationItem...");
    const quotationItemsDeleted = await prisma.quotationItem.deleteMany({});
    console.log(`   ✓ Deleted ${quotationItemsDeleted.count} QuotationItem records`);

    console.log("📦 Deleting CategoryGroup...");
    const categoryGroupsDeleted = await prisma.categoryGroup.deleteMany({});
    console.log(`   ✓ Deleted ${categoryGroupsDeleted.count} CategoryGroup records`);

    console.log("📦 Deleting ItemGroup...");
    const itemGroupsDeleted = await prisma.itemGroup.deleteMany({});
    console.log(`   ✓ Deleted ${itemGroupsDeleted.count} ItemGroup records`);

    console.log("📦 Deleting Section...");
    const sectionsDeleted = await prisma.section.deleteMany({});
    console.log(`   ✓ Deleted ${sectionsDeleted.count} Section records`);

    console.log("📦 Deleting Quotation...");
    const quotationsDeleted = await prisma.quotation.deleteMany({});
    console.log(`   ✓ Deleted ${quotationsDeleted.count} Quotation records`);

    console.log("📦 Deleting ModuleGroupItem...");
    const moduleGroupItemsDeleted = await prisma.moduleGroupItem.deleteMany({});
    console.log(`   ✓ Deleted ${moduleGroupItemsDeleted.count} ModuleGroupItem records`);

    console.log("📦 Deleting ItemCategory...");
    const itemCategoriesDeleted = await prisma.itemCategory.deleteMany({});
    console.log(`   ✓ Deleted ${itemCategoriesDeleted.count} ItemCategory records`);

    console.log("📦 Deleting Item...");
    const itemsDeleted = await prisma.item.deleteMany({});
    console.log(`   ✓ Deleted ${itemsDeleted.count} Item records`);

    console.log("📦 Deleting ModuleGroup...");
    const moduleGroupsDeleted = await prisma.moduleGroup.deleteMany({});
    console.log(`   ✓ Deleted ${moduleGroupsDeleted.count} ModuleGroup records`);

    console.log("📦 Deleting CoverLetter...");
    const coverLettersDeleted = await prisma.coverLetter.deleteMany({});
    console.log(`   ✓ Deleted ${coverLettersDeleted.count} CoverLetter records`);

    console.log("📦 Deleting Settings...");
    const settingsDeleted = await prisma.settings.deleteMany({});
    console.log(`   ✓ Deleted ${settingsDeleted.count} Settings records`);

    console.log("📦 Deleting Client...");
    const clientsDeleted = await prisma.client.deleteMany({});
    console.log(`   ✓ Deleted ${clientsDeleted.count} Client records`);

    console.log("📦 Deleting Supplier...");
    const suppliersDeleted = await prisma.supplier.deleteMany({});
    console.log(`   ✓ Deleted ${suppliersDeleted.count} Supplier records`);

    console.log("📦 Deleting Category...");
    const categoriesDeleted = await prisma.category.deleteMany({});
    console.log(`   ✓ Deleted ${categoriesDeleted.count} Category records`);

    console.log("📦 Deleting Unit...");
    const unitsDeleted = await prisma.unit.deleteMany({});
    console.log(`   ✓ Deleted ${unitsDeleted.count} Unit records`);

    console.log("📦 Deleting File...");
    const filesDeleted = await prisma.file.deleteMany({});
    console.log(`   ✓ Deleted ${filesDeleted.count} File records`);

    console.log("📦 Deleting Notification...");
    const notificationsDeleted = await prisma.notification.deleteMany({});
    console.log(`   ✓ Deleted ${notificationsDeleted.count} Notification records`);

    console.log("📦 Deleting UserLog...");
    const userLogsDeleted = await prisma.userLog.deleteMany({});
    console.log(`   ✓ Deleted ${userLogsDeleted.count} UserLog records`);

    console.log("📦 Deleting Account...");
    const accountsDeleted = await prisma.account.deleteMany({});
    console.log(`   ✓ Deleted ${accountsDeleted.count} Account records`);

    console.log("📦 Deleting Session...");
    const sessionsDeleted = await prisma.session.deleteMany({});
    console.log(`   ✓ Deleted ${sessionsDeleted.count} Session records`);

    console.log("📦 Deleting VerificationToken...");
    const verificationTokensDeleted = await prisma.verificationToken.deleteMany({});
    console.log(`   ✓ Deleted ${verificationTokensDeleted.count} VerificationToken records`);

    console.log("📦 Deleting PasswordReset...");
    const passwordResetsDeleted = await prisma.passwordReset.deleteMany({});
    console.log(`   ✓ Deleted ${passwordResetsDeleted.count} PasswordReset records`);

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

    // Count remaining records
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Database reset completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n📊 Remaining records:`);
    console.log(`   • Users: ${userCount}`);
    console.log(`   • Organizations: ${orgCount}`);
    console.log("\n✨ All other data has been deleted.\n");
  } catch (error) {
    console.error("\n❌ Error during database reset:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log("🎉 Reset script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Reset script failed:", error);
    process.exit(1);
  });

