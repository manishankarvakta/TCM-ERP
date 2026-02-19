import { prisma } from '../lib/prisma';
import { generateLeadNumber } from '../app/actions/crm/lead.action';

async function main() {
  console.log('Starting direct Prisma lead number backfill...');
  try {
    const leadsToBackfill = await prisma.lead.findMany({
      where: { leadNumber: null },
      orderBy: { createdAt: "asc" }
    });

    console.log(`Found ${leadsToBackfill.length} leads to backfill.`);

    for (const lead of leadsToBackfill) {
      const leadNumber = await generateLeadNumber();
      console.log(`Backfilling lead ${lead.id} with ${leadNumber}`);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { leadNumber }
      });
    }

    console.log('Backfill completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Execution error:', err);
    process.exit(1);
  }
}

main();
