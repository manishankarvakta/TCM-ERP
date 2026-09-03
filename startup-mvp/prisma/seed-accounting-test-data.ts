import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds test data for accounting visibility
 * 
 * Creates:
 * - Multiple test clients
 * - Multiple test suppliers
 * - Multiple draft quotations
 * - Multiple accepted quotations
 * 
 * NOTE: This script is idempotent - it only creates data if it doesn't already exist.
 * It checks for existing records by unique fields (email for clients/suppliers, 
 * quotationNumber for quotations) and skips creation if found.
 * 
 * Dependencies:
 * - Requires at least one User (preferably admin) to exist
 * - Test clients are created first (quotations depend on them)
 */

/**
 * Find a user to use as creator/submitter
 */
async function findCreator() {
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
      "No users found in DB. Cannot seed test data because User references are required. Create a user first, then re-run the seed."
    );
  }

  return creator;
}

/**
 * Seed test clients
 * Creates 10 test clients if they don't already exist
 */
async function seedTestClients(creatorId: string) {
  console.log("\n👥 Seeding Test Clients...");

  const testClients = [
    {
      name: "Test Client 1",
      email: "test-client-1@example.com",
      phone: "+1234567890",
      address: "123 Test Street",
      city: "Test City",
      state: "Test State",
      zip: "12345",
      country: "USA",
      company: "Test Company 1",
    },
    {
      name: "Test Client 2",
      email: "test-client-2@example.com",
      phone: "+1234567891",
      address: "456 Sample Avenue",
      city: "Sample City",
      state: "Sample State",
      zip: "54321",
      country: "USA",
      company: "Test Company 2",
    },
    {
      name: "Test Client 3",
      email: "test-client-3@example.com",
      phone: "+1234567892",
      address: "789 Demo Road",
      city: "Demo City",
      state: "Demo State",
      zip: "67890",
      country: "USA",
      company: "Test Company 3",
    },
    {
      name: "Test Client 4",
      email: "test-client-4@example.com",
      phone: "+1234567893",
      address: "321 Example Lane",
      city: "Example City",
      state: "Example State",
      zip: "11223",
      country: "USA",
      company: "Test Company 4",
    },
    {
      name: "Test Client 5",
      email: "test-client-5@example.com",
      phone: "+1234567894",
      address: "654 Practice Drive",
      city: "Practice City",
      state: "Practice State",
      zip: "99887",
      country: "USA",
      company: "Test Company 5",
    },
    {
      name: "Test Client 6",
      email: "test-client-6@example.com",
      phone: "+1234567895",
      address: "987 Business Boulevard",
      city: "Business City",
      state: "Business State",
      zip: "22334",
      country: "USA",
      company: "Test Company 6",
    },
    {
      name: "Test Client 7",
      email: "test-client-7@example.com",
      phone: "+1234567896",
      address: "147 Corporate Court",
      city: "Corporate City",
      state: "Corporate State",
      zip: "33445",
      country: "USA",
      company: "Test Company 7",
    },
    {
      name: "Test Client 8",
      email: "test-client-8@example.com",
      phone: "+1234567897",
      address: "258 Enterprise Way",
      city: "Enterprise City",
      state: "Enterprise State",
      zip: "44556",
      country: "USA",
      company: "Test Company 8",
    },
    {
      name: "Test Client 9",
      email: "test-client-9@example.com",
      phone: "+1234567898",
      address: "369 Industry Avenue",
      city: "Industry City",
      state: "Industry State",
      zip: "55667",
      country: "USA",
      company: "Test Company 9",
    },
    {
      name: "Test Client 10",
      email: "test-client-10@example.com",
      phone: "+1234567899",
      address: "741 Commerce Street",
      city: "Commerce City",
      state: "Commerce State",
      zip: "66778",
      country: "USA",
      company: "Test Company 10",
    },
  ];

  const createdClients: string[] = [];
  const skippedClients: string[] = [];

  for (const client of testClients) {
    const existing = await prisma.client.findUnique({
      where: { email: client.email },
    });

    if (existing) {
      skippedClients.push(client.email);
      console.log(`  ⏭️  Skipped (exists): ${client.email}`);
      continue;
    }

    const created = await prisma.client.create({
// @ts-expect-error - Legacy compatibility
      data: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
        country: client.country,
        company: client.company,
        status: "active",
        createdBy: creatorId,
      },
    });

    createdClients.push(created.email);
    console.log(`  ✅ Created: ${client.email} (${client.name})`);
  }

  console.log(`\n  📊 Summary: ${createdClients.length} created, ${skippedClients.length} skipped`);
  return createdClients.length + skippedClients.length > 0
    ? await prisma.client.findMany({
        where: {
          email: { in: [...createdClients, ...skippedClients] },
        },
        select: { id: true, email: true },
      })
    : [];
}

/**
 * Seed test suppliers
 * Creates 10 test suppliers if they don't already exist
 */
async function seedTestSuppliers(creatorId: string) {
  console.log("\n🏭 Seeding Test Suppliers...");

  const testSuppliers = [
    {
      name: "Test Supplier 1",
      email: "test-supplier-1@example.com",
      phone: "+1987654321",
      address: "111 Supplier Street",
      city: "Supplier City",
      state: "Supplier State",
      zip: "11111",
      country: "USA",
      company: "Supplier Corp 1",
    },
    {
      name: "Test Supplier 2",
      email: "test-supplier-2@example.com",
      phone: "+1987654322",
      address: "222 Vendor Avenue",
      city: "Vendor City",
      state: "Vendor State",
      zip: "22222",
      country: "USA",
      company: "Supplier Corp 2",
    },
    {
      name: "Test Supplier 3",
      email: "test-supplier-3@example.com",
      phone: "+1987654323",
      address: "333 Provider Road",
      city: "Provider City",
      state: "Provider State",
      zip: "33333",
      country: "USA",
      company: "Supplier Corp 3",
    },
    {
      name: "Test Supplier 4",
      email: "test-supplier-4@example.com",
      phone: "+1987654324",
      address: "444 Source Lane",
      city: "Source City",
      state: "Source State",
      zip: "44444",
      country: "USA",
      company: "Supplier Corp 4",
    },
    {
      name: "Test Supplier 5",
      email: "test-supplier-5@example.com",
      phone: "+1987654325",
      address: "555 Origin Drive",
      city: "Origin City",
      state: "Origin State",
      zip: "55555",
      country: "USA",
      company: "Supplier Corp 5",
    },
    {
      name: "Test Supplier 6",
      email: "test-supplier-6@example.com",
      phone: "+1987654326",
      address: "666 Materials Boulevard",
      city: "Materials City",
      state: "Materials State",
      zip: "66666",
      country: "USA",
      company: "Supplier Corp 6",
    },
    {
      name: "Test Supplier 7",
      email: "test-supplier-7@example.com",
      phone: "+1987654327",
      address: "777 Goods Court",
      city: "Goods City",
      state: "Goods State",
      zip: "77777",
      country: "USA",
      company: "Supplier Corp 7",
    },
    {
      name: "Test Supplier 8",
      email: "test-supplier-8@example.com",
      phone: "+1987654328",
      address: "888 Products Way",
      city: "Products City",
      state: "Products State",
      zip: "88888",
      country: "USA",
      company: "Supplier Corp 8",
    },
    {
      name: "Test Supplier 9",
      email: "test-supplier-9@example.com",
      phone: "+1987654329",
      address: "999 Services Avenue",
      city: "Services City",
      state: "Services State",
      zip: "99999",
      country: "USA",
      company: "Supplier Corp 9",
    },
    {
      name: "Test Supplier 10",
      email: "test-supplier-10@example.com",
      phone: "+1987654330",
      address: "1010 Resources Street",
      city: "Resources City",
      state: "Resources State",
      zip: "10101",
      country: "USA",
      company: "Supplier Corp 10",
    },
  ];

  const createdSuppliers: string[] = [];
  const skippedSuppliers: string[] = [];

  for (const supplier of testSuppliers) {
    const existing = await prisma.supplier.findUnique({
      where: { email: supplier.email },
    });

    if (existing) {
      skippedSuppliers.push(supplier.email);
      console.log(`  ⏭️  Skipped (exists): ${supplier.email}`);
      continue;
    }

    const created = await prisma.supplier.create({
      data: {
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        zip: supplier.zip,
        country: supplier.country,
        company: supplier.company,
        status: "active",
        createdBy: creatorId,
      },
    });

    createdSuppliers.push(created.email);
    console.log(`  ✅ Created: ${supplier.email} (${supplier.name})`);
  }

  console.log(`\n  📊 Summary: ${createdSuppliers.length} created, ${skippedSuppliers.length} skipped`);
}

/**
 * Seed draft quotations
 * Creates 10 draft quotations if they don't already exist
 */
async function seedDraftQuotations(creatorId: string, clients: Array<{ id: string; email: string }>) {
  console.log("\n📄 Seeding Draft Quotations...");

  if (clients.length === 0) {
    console.log("  ⚠️  No clients available. Skipping draft quotations.");
    return;
  }

  const draftQuotations = [
    {
      quotationNumber: "QT-TEST-DRAFT-001",
      subject: "Test Draft Quotation 1",
      total: 15000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-002",
      subject: "Test Draft Quotation 2",
      total: 25000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-003",
      subject: "Test Draft Quotation 3",
      total: 35000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-004",
      subject: "Test Draft Quotation 4",
      total: 45000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-005",
      subject: "Test Draft Quotation 5",
      total: 55000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-006",
      subject: "Test Draft Quotation 6",
      total: 65000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-007",
      subject: "Test Draft Quotation 7",
      total: 75000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-008",
      subject: "Test Draft Quotation 8",
      total: 85000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-009",
      subject: "Test Draft Quotation 9",
      total: 95000.00,
    },
    {
      quotationNumber: "QT-TEST-DRAFT-010",
      subject: "Test Draft Quotation 10",
      total: 105000.00,
    },
  ];

  const createdQuotations: string[] = [];
  const skippedQuotations: string[] = [];

  for (let i = 0; i < draftQuotations.length; i++) {
    const quotation = draftQuotations[i];
    const client = clients[i % clients.length]; // Cycle through available clients

    const existing = await prisma.quotation.findUnique({
      where: { quotationNumber: quotation.quotationNumber },
    });

    if (existing) {
      skippedQuotations.push(quotation.quotationNumber);
      console.log(`  ⏭️  Skipped (exists): ${quotation.quotationNumber}`);
      continue;
    }

    // Create quotation with a section and items
    const created = await prisma.quotation.create({
// @ts-expect-error - Legacy compatibility
      data: {
        quotationNumber: quotation.quotationNumber,
        subject: quotation.subject,
        date: new Date(),
        total: new Prisma.Decimal(quotation.total),
        grandTotal: new Prisma.Decimal(quotation.total),
        status: "DRAFT",
        clientId: client.id,
        submittedById: creatorId,
        isTrash: false,
        Section: {
          create: {
            title: "Main Section",
            note: "Test section for draft quotation",
            total: new Prisma.Decimal(quotation.total),
            grandTotal: new Prisma.Decimal(quotation.total),
            sortOrder: 0,
            QuotationItem: {
              create: [
                {
                  sl: 1,
                  description: "Test Item 1",
                  unitPrice: new Prisma.Decimal(quotation.total * 0.4),
                  quantity: new Prisma.Decimal(1),
                  amount: new Prisma.Decimal(quotation.total * 0.4),
                  sortOrder: 0,
                },
                {
                  sl: 2,
                  description: "Test Item 2",
                  unitPrice: new Prisma.Decimal(quotation.total * 0.6),
                  quantity: new Prisma.Decimal(1),
                  amount: new Prisma.Decimal(quotation.total * 0.6),
                  sortOrder: 1,
                },
              ],
            },
          },
        },
      },
    });

    createdQuotations.push(created.quotationNumber);
    console.log(`  ✅ Created: ${quotation.quotationNumber} (${quotation.subject}) - Client: ${client.email}`);
  }

  console.log(`\n  📊 Summary: ${createdQuotations.length} created, ${skippedQuotations.length} skipped`);
}

/**
 * Seed accepted quotations
 * Creates 10 accepted quotations if they don't already exist
 */
async function seedAcceptedQuotations(creatorId: string, clients: Array<{ id: string; email: string }>) {
  console.log("\n✅ Seeding Accepted Quotations...");

  if (clients.length === 0) {
    console.log("  ⚠️  No clients available. Skipping accepted quotations.");
    return;
  }

  const acceptedQuotations = [
    {
      quotationNumber: "QT-TEST-ACCEPTED-001",
      subject: "Test Accepted Quotation 1",
      total: 20000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-002",
      subject: "Test Accepted Quotation 2",
      total: 30000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-003",
      subject: "Test Accepted Quotation 3",
      total: 40000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-004",
      subject: "Test Accepted Quotation 4",
      total: 50000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-005",
      subject: "Test Accepted Quotation 5",
      total: 60000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-006",
      subject: "Test Accepted Quotation 6",
      total: 70000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-007",
      subject: "Test Accepted Quotation 7",
      total: 80000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-008",
      subject: "Test Accepted Quotation 8",
      total: 90000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-009",
      subject: "Test Accepted Quotation 9",
      total: 100000.00,
    },
    {
      quotationNumber: "QT-TEST-ACCEPTED-010",
      subject: "Test Accepted Quotation 10",
      total: 110000.00,
    },
  ];

  const createdQuotations: string[] = [];
  const skippedQuotations: string[] = [];

  for (let i = 0; i < acceptedQuotations.length; i++) {
    const quotation = acceptedQuotations[i];
    const client = clients[i % clients.length]; // Cycle through available clients

    const existing = await prisma.quotation.findUnique({
      where: { quotationNumber: quotation.quotationNumber },
    });

    if (existing) {
      skippedQuotations.push(quotation.quotationNumber);
      console.log(`  ⏭️  Skipped (exists): ${quotation.quotationNumber}`);
      continue;
    }

    // Create quotation with a section and items
    const created = await prisma.quotation.create({
// @ts-expect-error - Legacy compatibility
      data: {
        quotationNumber: quotation.quotationNumber,
        subject: quotation.subject,
        date: new Date(),
        total: new Prisma.Decimal(quotation.total),
        grandTotal: new Prisma.Decimal(quotation.total),
        status: "ACCEPTED",
        clientId: client.id,
        submittedById: creatorId,
        isTrash: false,
        Section: {
          create: {
            title: "Main Section",
            note: "Test section for accepted quotation",
            total: new Prisma.Decimal(quotation.total),
            grandTotal: new Prisma.Decimal(quotation.total),
            sortOrder: 0,
            QuotationItem: {
              create: [
                {
                  sl: 1,
                  description: "Test Item 1",
                  unitPrice: new Prisma.Decimal(quotation.total * 0.5),
                  quantity: new Prisma.Decimal(1),
                  amount: new Prisma.Decimal(quotation.total * 0.5),
                  sortOrder: 0,
                },
                {
                  sl: 2,
                  description: "Test Item 2",
                  unitPrice: new Prisma.Decimal(quotation.total * 0.5),
                  quantity: new Prisma.Decimal(1),
                  amount: new Prisma.Decimal(quotation.total * 0.5),
                  sortOrder: 1,
                },
              ],
            },
          },
        },
      },
    });

    createdQuotations.push(created.quotationNumber);
    console.log(`  ✅ Created: ${quotation.quotationNumber} (${quotation.subject}) - Client: ${client.email}`);
  }

  console.log(`\n  📊 Summary: ${createdQuotations.length} created, ${skippedQuotations.length} skipped`);
}

/**
 * Main seed function
 */
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Seeding Accounting Test Data");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Find creator user
    const creator = await findCreator();
    console.log(`\n👤 Using creator: ${creator.email ?? creator.id}`);

    // Seed in order: clients → suppliers → quotations
    const clients = await seedTestClients(creator.id);
    await seedTestSuppliers(creator.id);
    await seedDraftQuotations(creator.id, clients);
    await seedAcceptedQuotations(creator.id, clients);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: Accounting test data seeding completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📋 Seeded Data:");
    console.log("   • Test Clients: 10 (created if not exist)");
    console.log("   • Test Suppliers: 10 (created if not exist)");
    console.log("   • Draft Quotations: 10 (created if not exist)");
    console.log("   • Accepted Quotations: 10 (created if not exist)");
    console.log("\n💡 This script is idempotent - safe to run multiple times");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding accounting test data failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("💥 Fatal error details:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

