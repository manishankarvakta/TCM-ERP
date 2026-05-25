import { prisma } from "./lib/prisma";

async function main() {
  const template = await prisma.permissionTemplate.findFirst({
    where: { name: "Super Admin" }
  });
  if (!template) {
    console.log("Super Admin template not found");
    return;
  }
  console.log(`Template: ${template.name}`);
  const perms = template.permissions as any;
  console.log("Template permissions keys count:", Object.keys(perms).length);
  for (const [key, value] of Object.entries(perms)) {
    console.log(`  - Key: ${key}, Value: ${JSON.stringify(value)}`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
