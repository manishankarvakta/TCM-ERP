import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'aronnomujtabins@gmail.com' },
    include: {
      PermissionTemplate: true,
      UserPermission: true
    }
  });

  if (!user) {
    console.log('User aronnomujtabins@gmail.com not found.');
    return;
  }

  console.log(`User: ${user.name} (${user.email})`);
  console.log(`Role: ${user.role}`);
  console.log(`Template: ${user.PermissionTemplate?.name || 'None'}`);
  console.log(`Direct Permissions:`);
  console.log(JSON.stringify(user.UserPermission, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
