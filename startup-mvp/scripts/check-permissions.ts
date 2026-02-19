import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      UserPermission: true,
      PermissionTemplate: true,
    },
  });

  console.log('Users and their permissions:');
  users.forEach(user => {
    console.log(`User: ${user.email} (Role: ${user.role})`);
    console.log(`Designation Template: ${user.PermissionTemplate?.name || 'None'}`);
    console.log(`User Permissions (${user.UserPermission.length}):`);
    user.UserPermission.forEach(up => {
      console.log(`  - ${up.module}: ${JSON.stringify(up.operations)}`);
    });
    console.log('---');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
