import { prisma } from "../lib/prisma";

async function main() {
  try {
    const page = 1;
    const limit = 10;
    const search = "";
    const status: string = "all";
    const skip = 0;

    const where: any = {
      isTrash: status === "trash",
      ...(search
        ? {
            OR: [
              { grnNumber: { contains: search, mode: "insensitive" } },
              { purchase: { purchaseNumber: { contains: search, mode: "insensitive" } } },
              { purchase: { supplier: { name: { contains: search, mode: "insensitive" } } } },
              { purchase: { supplier: { email: { contains: search, mode: "insensitive" } } } },
              { purchase: { supplier: { company: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const grns = await prisma.gRN.findMany({
      where,
      include: {
        purchase: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    console.log("Success findMany", grns.length);
    
    const grnIds = grns.map(g => g.id);
    const grnItems = await prisma.gRNItem.findMany({
      where: { grnId: { in: grnIds } },
      include: { purchaseItem: true },
    });
    console.log("Success findMany grnItems", grnItems.length);
  } catch (e: any) {
    console.error(e.message);
  }
}

main();
