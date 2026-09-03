const dotenv = require('dotenv');
dotenv.config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== RESTORING MISSING CLIENTS FOR OPPORTUNITIES ===");
  const targetOrgId = "cmltc6oik002yn1011ghceakr";
  const adminUserId = "cmj9sd9xq0000o1010acd1hsq";

  // Get all orphaned client IDs referenced by Opportunities
  const orphanedRows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT o."clientId", o.title
    FROM "Opportunity" o
    WHERE o."clientId" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "Client" c WHERE c.id = o."clientId")
  `);

  console.log(`Found ${orphanedRows.length} missing client IDs`);

  let created = 0;
  for (const row of orphanedRows) {
    const clientId = row.clientId;
    const oppTitle = row.title || '';

    try {
      // Try to get name from Contact using Prisma (camelCase)
      const relatedContact = await prisma.contact.findFirst({
        where: { clientId },
        select: { firstName: true, lastName: true, email: true, phone: true }
      });

      let name = oppTitle || `Restored Client ${clientId.slice(-6)}`;
      let email = null;
      let phone = null;
      if (relatedContact) {
        const fullName = `${relatedContact.firstName || ''} ${relatedContact.lastName || ''}`.trim();
        if (fullName) name = fullName;
        email = relatedContact.email || null;
        phone = relatedContact.phone || null;
      }

      await prisma.client.create({
        data: {
          id: clientId,
          name: name,
          email: email,
          phone: phone,
          company: name,
          status: 'active',
          createdBy: adminUserId,
          organizationId: targetOrgId
        }
      });
      created++;
      console.log(`✅ ${created}. Created client: ${clientId} -> "${name}"`);
    } catch (e) {
      if (e.code === 'P2002') {
        console.log(`⏭️ Client ${clientId} already exists (skipped)`);
      } else {
        console.error(`❌ Error creating client ${clientId}: ${e.message}`);
      }
    }
  }

  const remaining = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Opportunity" o
    WHERE o."clientId" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "Client" c WHERE c.id = o."clientId")
  `);

  console.log(`\n=== DONE ===`);
  console.log(`Created ${created} client placeholders`);
  console.log(`Remaining orphaned refs: ${remaining[0].count}`);
  console.log(`Total clients now: ${await prisma.client.count()}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
