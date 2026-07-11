import { prisma } from "./lib/prisma";
import type { Operation, EnhancedPermissions } from "./types/permissions";
import { isEnhancedPermissions, convertToLegacyPermissions } from "./types/permissions";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "hasib@techsoulbd.com" }
  });
  if (!user) {
    console.log("Hasib not found");
    return;
  }
  if (!user.designationTemplateId) {
    console.log("Hasib has no template assigned");
    return;
  }
  
  console.log(`Directly syncing Hasib's UserPermission records with template...`);
  
  // 1. Get template
  const template = await prisma.permissionTemplate.findUnique({
    where: { id: user.designationTemplateId }
  });
  if (!template) {
    console.log("Template not found");
    return;
  }

  const templatePerms = template.permissions as any;
  
  // Convert to legacy format
  let legacyPermissions: Record<string, Operation[]> = {};
  if (isEnhancedPermissions(templatePerms)) {
    legacyPermissions = convertToLegacyPermissions(templatePerms) as Record<string, Operation[]>;
  } else {
    legacyPermissions = templatePerms;
  }

  // 2. Upsert each module permission
  for (const [module, operations] of Object.entries(legacyPermissions)) {
    await prisma.userPermission.upsert({
      where: {
        userId_module: {
          userId: user.id,
          module
        }
      },
      create: {
        userId: user.id,
        module,
        operations: operations as any
      },
      update: {
        operations: operations as any
      }
    });
  }

  // 3. Clean up user permissions not in template
  const templateKeys = new Set(Object.keys(legacyPermissions));
  const userPerms = await prisma.userPermission.findMany({
    where: { userId: user.id }
  });
  for (const up of userPerms) {
    if (!templateKeys.has(up.module)) {
      console.log(`Removing extra permission: ${up.module}`);
      await prisma.userPermission.delete({
        where: { id: up.id }
      });
    }
  }

  // 4. Update cached permissions on the user record
  const allUserPermissions = await prisma.userPermission.findMany({
    where: { userId: user.id }
  });
  const cachedPerms: Record<string, Operation[]> = {};
  for (const up of allUserPermissions) {
    cachedPerms[up.module] = up.operations as Operation[];
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      permissions: cachedPerms as any
    }
  });

  console.log("Successfully synced Hasib's permissions directly in the database!");
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
