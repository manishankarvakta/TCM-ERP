import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, saleNumber: true, date: true, createdAt: true, status: true, warehouseId: true, createdBy: true }
  })
  console.log("Recent Sales:")
  sales.forEach(s => console.log(JSON.stringify(s)))
}
main()
