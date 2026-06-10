import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { userPermissions: true } });
  for (const u of users) {
    if (u.role === 'admin') {
      const tpnPerm = u.userPermissions.find(p => p.module === 'inventory.tpn');
      console.log(`Admin ${u.email} has tpn perm:`, tpnPerm);
      if (!tpnPerm) {
        await prisma.userPermission.create({
          data: {
            userId: u.id,
            module: 'inventory.tpn',
            operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
          }
        });
        console.log("Added inventory.tpn permission for Admin.");
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
