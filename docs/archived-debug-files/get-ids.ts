import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst();
  const contact = await prisma.contact.findFirst();
  const opportunity = await prisma.opportunity.findFirst();

  console.log('Lead ID:', lead?.id);
  console.log('Contact ID:', contact?.id);
  console.log('Opportunity ID:', opportunity?.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
