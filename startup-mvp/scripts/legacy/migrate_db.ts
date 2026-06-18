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
      await prisma.userPermission.update({
        where: { id: perm.id },
        data: { module: replacements[perm.module] }
      });
      permUpdated++;
    }
  }

  // Update ModuleOperation
  const modOps = await prisma.moduleOperation.findMany();
  let opUpdated = 0;
  for (const op of modOps) {
    if (replacements[op.module]) {
      // Check if it exists first
      const exists = await prisma.moduleOperation.findUnique({
        where: {
          module_operation: {
            module: replacements[op.module],
            operation: op.operation
          }
        }
      });
      if (!exists) {
        await prisma.moduleOperation.update({
          where: { id: op.id },
          data: { module: replacements[op.module] }
        });
        opUpdated++;
      } else {
        await prisma.moduleOperation.delete({ where: { id: op.id } });
      }
    }
  }

  // Update DesignationTemplate
  const templates = await prisma.designationTemplate.findMany();
  let tmplUpdated = 0;
  for (const t of templates) {
    const p = t.permissions as Record<string, any>;
    let changed = false;
    const newP: Record<string, any> = {};
    for (const key in p) {
      if (replacements[key]) {
        newP[replacements[key]] = p[key];
        changed = true;
      } else {
        newP[key] = p[key];
      }
    }
    if (changed) {
      await prisma.designationTemplate.update({
        where: { id: t.id },
        data: { permissions: newP }
      });
      tmplUpdated++;
    }
  }

  console.log(`Updated ${permUpdated} UserPermissions, ${opUpdated} ModuleOperations, ${tmplUpdated} DesignationTemplates`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
