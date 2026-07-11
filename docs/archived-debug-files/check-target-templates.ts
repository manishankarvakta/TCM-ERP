import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.permissionTemplate.findMany({
    where: {
      name: {
        in: ["Super Admin", "Basic User"]
      }
    }
  });

  for (const t of templates) {
    console.log(`Template Name: ${t.name}`);
    const perms = t.permissions as any;
    console.log(`  projects.timeline:`, perms?.["projects.timeline"]);
    console.log(`  projects.projects:`, perms?.["projects.projects"]);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
