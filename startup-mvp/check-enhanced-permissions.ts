import { prisma } from "./lib/prisma";
import { getUserPermissions, getUserPermissionsEnhanced } from "./lib/permissions";

async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(`\nUser: ${u.name} (${u.email}) [ID: ${u.id}]`);
    const direct = await getUserPermissions(u.id);
    let cached = null;
    try {
      cached = await getUserPermissionsEnhanced(u.id);
    } catch (e) {
      // Ignored in CLI
    }
    console.log(`Direct projects.timeline:`, direct['projects.timeline']);
    console.log(`Cached projects.timeline:`, cached ? cached['projects.timeline'] : 'Error (CLI)');
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
