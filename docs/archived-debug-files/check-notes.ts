import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const notes = await prisma.note.findMany({ take: 3 });
  console.log(notes);
}
main();
