import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== USERS AND ROLES ===");
  try {
    const users = await prisma.user.findMany({
      include: {
        PermissionTemplate: true,
        UserPermission: true,
      }
    });

    users.forEach(u => {
      console.log(`User: ${u.name} (${u.email})`);
      console.log(`  id: ${u.id}`);
      console.log(`  role: ${u.role}`);
      console.log(`  status: ${u.status}`);
      console.log(`  template: ${u.PermissionTemplate?.name}`);
      console.log(`  permissions count: ${u.UserPermission.length}`);
      if (u.UserPermission.length > 0) {
        console.log(`  permissions modules:`, u.UserPermission.map(p => p.module));
      }
    });

  } catch (error) {
    console.error("error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
