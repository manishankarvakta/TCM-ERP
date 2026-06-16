import { prisma } from './lib/prisma';
import { hasPermission } from './lib/permissions';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "admin@example.com" }});
  if (!user) return console.log("No user");
  const canView = await hasPermission(user.id, "inventory.damage", "view");
  console.log("canView:", canView);
}
main();
