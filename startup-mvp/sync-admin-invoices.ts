
import { prisma } from "./lib/prisma";

async function main() {
  console.log("Syncing admin permissions for invoices...");
  
  // Try to find admin user
  let user = await prisma.user.findFirst({
    where: { role: "admin" }
  });

  if (!user) {
    user = await prisma.user.findFirst({
        where: { email: "admin@espacio.com" }
    });
  }

  if (!user) {
    console.log("Admin user not found.");
    return;
  }

  console.log(`Found admin user: ${user.email} (${user.id})`);

  // Update permissions via UserPermission model
  const permissionKey = "quotations.invoices";
  const operations = ["create", "view", "edit", "move-to-trash", "delete-permanently"];

  console.log(`Upserting permissions for ${permissionKey}...`);
  
  await prisma.userPermission.upsert({
    where: {
      userId_module: {
        userId: user.id,
        module: permissionKey,
      },
    },
    create: {
      userId: user.id,
      module: permissionKey,
      operations: operations,
    },
    update: {
      operations: operations,
    },
  });

  console.log("Permissions synced successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
