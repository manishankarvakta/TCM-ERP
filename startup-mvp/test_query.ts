import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const where: any = {
    isTrash: false,
    warehouseId: "cmq6v4rc50015ck429zfqg3sz",
  }
  where.date = {};
  where.date.gte = new Date("2026-06-12T18:00:00.000Z");
  where.date.lte = new Date("2026-06-13T17:59:59.999Z");

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5
  })
  console.log("Sales found:", sales.map(s => s.saleNumber))

  // Try with server timezone logic:
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth();
  const dd = today.getDate();
  const start = new Date(yyyy, mm, dd, 0, 0, 0).toISOString();
  const end = new Date(yyyy, mm, dd, 23, 59, 59, 999).toISOString();
  console.log("Server today start:", start, "end:", end)
  where.date.gte = new Date(start);
  where.date.lte = new Date(end);
  const sales2 = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5
  })
  console.log("Sales found with server today dates:", sales2.map(s => s.saleNumber))

  // Check the raw sale date
  const s = await prisma.sale.findUnique({where: {id: "cmqbi6jmf0047ckps6u9zxs3c"}})
  console.log("Raw sale date:", s?.date)
}
main()
