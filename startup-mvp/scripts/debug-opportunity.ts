
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const opportunityId = "c6b994aa-3a7f-4cff-81b8-30357068dfe0";
  console.log(`Fetching opportunity with ID: ${opportunityId}`);

  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        Client: true,
        Contact: true,
        User: {
          select: { name: true, email: true }
        }
      },
    });

    console.log("Successfully fetched opportunity:", opportunity);
  } catch (error) {
    console.error("Error fetching opportunity:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
