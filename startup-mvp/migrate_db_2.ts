import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const replacements: Record<string, string> = {
    "purchases.purchases": "procurements.purchases",
    "purchases.grn": "procurements.grn",
    "rtv.rtv": "procurements.rtv",
    "inventory.tpn": "procurements.tpn",
  };

  // Update UserPermission
  const perms = await prisma.userPermission.findMany();
  let permUpdated = 0;
  for (const perm of perms) {
    if (replacements[perm.module]) {
      // Check if user already has the new permission
      const exists = await prisma.userPermission.findFirst({
        where: {
          userId: perm.userId,
          module: replacements[perm.module]
        }
      });
      if (!exists) {
        await prisma.userPermission.update({
          where: { id: perm.id },
          data: { module: replacements[perm.module] }
        });
        permUpdated++;
      } else {
        // If it already exists, just delete the old one or merge operations
        const oldOps = perm.operations || [];
        const newOps = exists.operations || [];
        const mergedOps = Array.from(new Set([...oldOps, ...newOps]));
        
        await prisma.userPermission.update({
          where: { id: exists.id },
          data: { operations: mergedOps }
        });
        await prisma.userPermission.delete({ where: { id: perm.id } });
      }
    }
  }

  console.log(`Updated ${permUpdated} UserPermissions`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
