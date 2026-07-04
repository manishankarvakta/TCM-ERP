import { prisma } from "./lib/prisma";
import { checkPermission } from "./lib/permissions";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      PermissionTemplate: true,
      UserPermission: true,
    }
  });

  console.log(`Checking ${users.length} users...`);
  for (const user of users) {
    const hasTimelinePermission = await checkPermission(user.id, "projects.timeline", "read");
    console.log(`\nUser: ${user.name} (${user.email})`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Template: ${user.PermissionTemplate?.name || "None"}`);
    console.log(`  Direct Permission Count: ${user.UserPermission?.length || 0}`);
    console.log(`  checkPermission("projects.timeline", "read"): ${hasTimelinePermission}`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
