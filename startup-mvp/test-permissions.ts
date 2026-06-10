const { getUserPermissionsEnhanced, canAccessModule, hasPermission } = require('./lib/permissions');
const { prisma } = require('./lib/prisma');

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  
  console.log("Testing for user:", user.id);
  
  const perms = await getUserPermissionsEnhanced(user.id);
  console.log("Enhanced perms:", JSON.stringify(perms, null, 2).slice(0, 500) + '...');
  
  const hasItemsCreate = await hasPermission(user.id, 'master.items', 'create');
  console.log("hasPermission(master.items, create):", hasItemsCreate);
  
  const accessMaster = await canAccessModule(user.id, 'master');
  console.log("canAccessModule(master):", accessMaster);
  
  const accessSales = await canAccessModule(user.id, 'sales');
  console.log("canAccessModule(sales):", accessSales);
}

test().catch(console.error).finally(() => process.exit(0));
