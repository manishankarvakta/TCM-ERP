import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const importantNotes = await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      User: { select: { name: true } },
      Lead: { select: { id: true, name: true } },
      Opportunity: { select: { id: true, title: true } },
      Contact: { select: { id: true, firstName: true, lastName: true } }
    }
  });
  console.dir(importantNotes, { depth: null });
}
main();
