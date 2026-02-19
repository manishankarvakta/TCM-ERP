import { PrismaClient, LeadStatus, OpportunityStage } from "@prisma/client";

const prisma = new PrismaClient();


async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: CRM Test Data");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Fetch users dynamically to avoid FK errors
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    const anikUser = await prisma.user.findFirst({ where: { email: "anik@techsoulbd.com" } });
    const rakibUser = await prisma.user.findFirst({ where: { email: "rakib@techsoulbd.com" } });

    if (!adminUser) {
        throw new Error("Admin user (admin@example.com) not found. Please run seed-users.ts first.");
    }

    const USER_IDS = {
      ADMIN: adminUser.id,
      ANIK: anikUser?.id || adminUser.id,
      RAKIB: rakibUser?.id || adminUser.id,
    };

    // 1. Seed Clients

    console.log("\n🏢 Seeding Clients...");
    const clients = [
      {
        id: "client-1",
        name: "Acme Corp",
        email: "contact@acme.com",
        phone: "+1-555-0101",
        company: "Acme Corporation",
        createdBy: USER_IDS.ADMIN,
        status: "active",
      },
      {
        id: "client-2",
        name: "Global Tech",
        email: "info@globaltech.io",
        phone: "+1-555-0202",
        company: "Global Tech Solutions",
        createdBy: USER_IDS.ANIK,
        status: "active",
      },
      {
        id: "client-3",
        name: "Innovative Soft",
        email: "hello@innovative.com",
        phone: "+1-555-0303",
        company: "Innovative Software Systems",
        createdBy: USER_IDS.RAKIB,
        status: "active",
      },
    ];

    for (const client of clients) {
      await prisma.client.upsert({
        where: { email: client.email },
        update: client,
        create: client,
      });
    }
    console.log(`✅ Seeded ${clients.length} clients`);

    // 2. Seed Leads
    console.log("\n🎯 Seeding Leads...");
    const leads = [
      {
        name: "John Smith",
        email: "john.smith@example.com",
        phone: "+1-555-1111",
        company: "Smith Enterprises",
        source: "Website",
        status: LeadStatus.NEW,
        ownerId: USER_IDS.ADMIN,
      },
      {
        name: "Sarah Johnson",
        email: "sarah.j@techcorp.com",
        phone: "+1-555-2222",
        company: "Tech Corp",
        source: "Referral",
        status: LeadStatus.CONTACTED,
        ownerId: USER_IDS.ANIK,
      },
      {
        name: "Michael Brown",
        email: "m.brown@startup.io",
        phone: "+1-555-3333",
        company: "NextGen Startup",
        source: "LinkedIn",
        status: LeadStatus.QUALIFIED,
        ownerId: USER_IDS.RAKIB,
      },
      {
        name: "Emily Davis",
        email: "emily.d@marketing.com",
        phone: "+1-555-4444",
        company: "Marketing Pro",
        source: "Direct",
        status: LeadStatus.NEW,
        ownerId: USER_IDS.ADMIN,
      },
      {
        name: "David Wilson",
        email: "david.w@retail.com",
        phone: "+1-555-5555",
        company: "Retail Giant",
        source: "Event",
        status: LeadStatus.UNQUALIFIED,
        ownerId: USER_IDS.ANIK,
      },
    ];

    for (const lead of leads) {
      await prisma.lead.upsert({
        where: { email: lead.email },
        update: lead,
        create: lead,
      });
    }
    console.log(`✅ Seeded ${leads.length} leads`);

    // 3. Seed Contacts
    console.log("\n👤 Seeding Contacts...");
    const contactData = [
      {
        id: "contact-1",
        firstName: "Alice",
        lastName: "Wonderland",
        email: "alice@acme.com",
        phone: "+1-555-0101",
        role: "CEO",
        clientId: "client-1",
        isPrimary: true,
      },
      {
        id: "contact-2",
        firstName: "Bob",
        lastName: "Builder",
        email: "bob@globaltech.io",
        phone: "+1-555-0202",
        role: "CTO",
        clientId: "client-2",
        isPrimary: true,
      },
      {
        id: "contact-3",
        firstName: "Charlie",
        lastName: "Chocolate",
        email: "charlie@innovative.com",
        phone: "+1-555-0303",
        role: "Product Manager",
        clientId: "client-3",
        isPrimary: true,
      },
    ];

    for (const contact of contactData) {
      await prisma.contact.upsert({
        where: { id: contact.id },
        update: contact,
        create: contact,
      });
    }
    console.log(`✅ Seeded ${contactData.length} contacts`);

    // 4. Seed Opportunities
    console.log("\n💰 Seeding Opportunities...");
    const opportunities = [
      {
        id: "opp-1",
        title: "Acme ERP Project",
        clientId: "client-1",
        contactId: "contact-1",
        value: 50000,
        stage: OpportunityStage.PROPOSAL,
        ownerId: USER_IDS.ADMIN,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: "opp-2",
        title: "Global Tech Cloud Migration",
        clientId: "client-2",
        contactId: "contact-2",
        value: 120000,
        stage: OpportunityStage.NEGOTIATION,
        ownerId: USER_IDS.ANIK,
        expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
      {
        id: "opp-3",
        title: "Innovative AI Integration",
        clientId: "client-3",
        contactId: "contact-3",
        value: 75000,
        stage: OpportunityStage.DISCOVERY,
        ownerId: USER_IDS.RAKIB,
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const opp of opportunities) {
      await prisma.opportunity.upsert({
        where: { id: opp.id },
        update: opp,
        create: opp,
      });
    }
    console.log(`✅ Seeded ${opportunities.length} opportunities`);

    // 5. Seed Activities
    console.log("\n📅 Seeding Activities...");
    const seededLeads = await prisma.lead.findMany();
    const seededContacts = await prisma.contact.findMany();
    const seededOpps = await prisma.opportunity.findMany();

    const activities = [
      {
        type: "call",
        subject: "Initial introduction call",
        description: "Discussed general requirements and company background.",
        entityType: "lead",
        entityId: seededLeads[0].id,
        ownerId: USER_IDS.ADMIN,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completed: true,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        type: "email",
        subject: "Follow-up email with pricing",
        description: "Sent preliminary pricing data for their review.",
        entityType: "lead",
        entityId: seededLeads[1].id,
        ownerId: USER_IDS.ANIK,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completed: true,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        type: "meeting",
        subject: "Product Demo",
        description: "Showcased core features of the CRM and Accounting modules.",
        entityType: "contact",
        entityId: seededContacts[0].id,
        ownerId: USER_IDS.ADMIN,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        completed: false,
      },
      {
        type: "note",
        subject: "Technical requirement notes",
        description: "Requires integration with existing legacy system.",
        entityType: "opportunity",
        entityId: seededOpps[0].id,
        ownerId: USER_IDS.ADMIN,
        completed: true,
        completedAt: new Date(),
      },
      {
        type: "call",
        subject: "Contract negotiation",
        description: "Discussed payment terms and SLA.",
        entityType: "opportunity",
        entityId: seededOpps[1].id,
        ownerId: USER_IDS.ANIK,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        completed: false,
      },
    ];

    for (const activity of activities) {
      await prisma.activity.create({
        data: activity,
      });
    }
    console.log(`✅ Seeded ${activities.length} activities`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: CRM Test Data seeded!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("\n❌ ERROR: Seeding failed!");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
