import { prisma } from './lib/prisma';
async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const perms = await prisma.userPermission.findMany({ where: { userId: u.id, module: 'inventory.damage' } });
    if (perms.length > 0) {
      const p = perms[0];
      const ops = new Set(p.operations as string[]);
      ops.add("edit");
      await prisma.userPermission.update({
        where: { id: p.id },
        data: { operations: Array.from(ops) }
      });
      console.log(`Granted edit to ${u.email} via UserPermission table`);
    } else {
      await prisma.userPermission.create({
        data: {
          userId: u.id,
          module: 'inventory.damage',
          operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
        }
      });
      console.log(`Created perms for ${u.email} via UserPermission table`);
    }

    // Also update legacy JSON if it exists
    if (u.permissions && typeof u.permissions === 'object') {
       const permsObj = u.permissions as any;
       if (permsObj['inventory.damage'] && Array.isArray(permsObj['inventory.damage'].operations)) {
           const ops = new Set(permsObj['inventory.damage'].operations);
           ops.add("edit");
           permsObj['inventory.damage'].operations = Array.from(ops);
           await prisma.user.update({
               where: { id: u.id },
               data: { permissions: permsObj }
           });
           console.log(`Granted edit to ${u.email} via legacy JSON`);
       }
    }
  }
}
main();
