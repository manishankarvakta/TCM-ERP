import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const adminId = 'cmj9sd9xq0000o1010acd1hsq';
  try {
    const events = await prisma.activity.findMany({
      where: {
        type: 'EVENT_SCHEDULED',
        OR: [
          { ownerId: adminId },
          { assignedToId: adminId },
          {
            metadata: {
              path: ['attendees'],
              array_contains: adminId // array_contains takes a string in this case
            }
          }
        ]
      },
      take: 1
    });
    console.log("Found:", events.length);
  } catch (e) {
    console.error(e);
  }
}
main();
