import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const note = await prisma.note.findUnique({
    where: { id: 'cmlw5h1id01b7nv01zrhrsjuo' },
    select: {
      id: true,
      title: true,
      User: { select: { name: true } },
      Lead: { select: { id: true, name: true } },
      Opportunity: { select: { id: true, title: true } },
      Contact: { select: { id: true, firstName: true, lastName: true } }
    }
  });
  console.dir(note, { depth: null });
}
main();
