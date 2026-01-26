import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹 Cleaning up Accounting Test Data");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // 1. Delete Quotations - SKIPPED (Model 'Quotation' not found in schema)
    // If the model was removed, the table might have been dropped or is inaccessible via Prisma.
    console.log("\n⚠️  Skipping Quotation deletion: Model 'Quotation' not found in current schema.");

    // 2. Delete Suppliers
    const supplierEmails = [
      "test-supplier-1@example.com", "test-supplier-2@example.com", 
      "test-supplier-3@example.com", "test-supplier-4@example.com",
      "test-supplier-5@example.com", "test-supplier-6@example.com",
      "test-supplier-7@example.com", "test-supplier-8@example.com",
      "test-supplier-9@example.com", "test-supplier-10@example.com"
    ];

    console.log("\n🗑️  Deleting Test Suppliers...");
    const deletedSuppliers = await prisma.supplier.deleteMany({
      where: { email: { in: supplierEmails } }
    });
    console.log(`  ✅ Deleted ${deletedSuppliers.count} suppliers`);

    // 3. Delete Clients
    const clientEmails = [
      "test-client-1@example.com", "test-client-2@example.com",
      "test-client-3@example.com", "test-client-4@example.com",
      "test-client-5@example.com", "test-client-6@example.com",
      "test-client-7@example.com", "test-client-8@example.com",
      "test-client-9@example.com", "test-client-10@example.com"
    ];

    console.log("\n🗑️  Deleting Test Clients...");
    const deletedClients = await prisma.client.deleteMany({
        where: { email: { in: clientEmails } }
    });
    console.log(`  ✅ Deleted ${deletedClients.count} clients`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Accounting test data cleanup completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("\n❌ ERROR: Cleanup failed!", error);
    throw error;
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
