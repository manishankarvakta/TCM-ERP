
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.error("No user found");
    return;
  }

  console.log(`Updating permissions for user: ${user.email}`);

  const currentPermissions = (user.permissions as any) || {};
  
  const newPermissions = {
    ...currentPermissions,
    "inventory.adjustments": {
      navigationVisible: true,
      pageAccess: true,
      operations: ["create", "view", "approve"],
    },
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { permissions: newPermissions },
  });

  console.log("Permissions updated successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
