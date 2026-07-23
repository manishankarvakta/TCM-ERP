import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const search = "s m";
  const searchWords = search.trim().split(/\s+/);

  const where = {
    OR: [
      { title: { contains: search, mode: "insensitive" as const } },
      { opportunityNumber: { contains: search, mode: "insensitive" as const } },
      {
        Client: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
          ]
        }
      },
      {
        Contact: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            {
              AND: searchWords.map(word => ({
                OR: [
                  { firstName: { contains: word, mode: "insensitive" as const } },
                  { lastName: { contains: word, mode: "insensitive" as const } }
                ]
              }))
            }
          ]
        }
      },
      {
        Lead: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
          ]
        }
      }
    ]
  };

  const opportunities = await prisma.opportunity.findMany({
    where,
    include: {
      Contact: true
    },
    orderBy: { updatedAt: "desc" }
  });

  console.log(`Total opportunities matching "s m": ${opportunities.length}`);
  opportunities.forEach((o, index) => {
    console.log(`${index + 1}. Num: ${o.opportunityNumber}, Title: ${o.title}, Contact: ${o.Contact?.firstName} ${o.Contact?.lastName}, UpdatedAt: ${o.updatedAt}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
