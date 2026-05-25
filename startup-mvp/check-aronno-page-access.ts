import { PrismaClient } from '@prisma/client';
import { canAccessPage, canAccessModule, checkPermission } from './lib/permissions';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'aronnomujtabins@gmail.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`Checking Aronno (ID: ${user.id}):`);
  console.log(`canAccessPage("projects.projects"):`, await canAccessPage(user.id, "projects.projects"));
  console.log(`canAccessModule("projects"):`, await canAccessModule(user.id, "projects"));
  console.log(`checkPermission("projects.projects", "view"):`, await checkPermission(user.id, "projects.projects", "view"));
  console.log(`checkPermission("projects.timeline", "read"):`, await checkPermission(user.id, "projects.timeline", "read"));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
