import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: "cmq6vicic0023ckxve6swe0fn" },
    select: { id: true, name: true, role: true, defaultWarehouseId: true }
  })
  console.log("User:", JSON.stringify(user))
}
main()
