import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const sale = await prisma.sale.findUnique({
    where: { id: "cmqbi6jmf0047ckps6u9zxs3c" },
    select: { id: true, saleNumber: true, isTrash: true }
  })
  console.log("Sale:", JSON.stringify(sale))
}
main()
