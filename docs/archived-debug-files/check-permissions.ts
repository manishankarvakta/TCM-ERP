import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      PermissionTemplate: true,
      UserPermission: {
        where: { module: 'projects.timeline' }
      }
    }
  });

  console.log('--- SUMMARIZED USER PERMISSIONS ---');
  for (const u of users) {
    console.log(`User ID: ${u.id}`);
    console.log(`Name: ${u.name}`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}`);
    console.log(`Direct Timeline Permissions:`, u.UserPermission.map(p => p.operations));
    
    // Check if the permissionTemplate has projects.timeline
    if (u.PermissionTemplate) {
      const perms: any = u.PermissionTemplate.permissions;
      console.log(`Template [${u.PermissionTemplate.name}] Timeline Permissions:`, perms['projects.timeline']);
    } else {
      console.log('No template assigned');
    }
    console.log('-----------------------------------');
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
