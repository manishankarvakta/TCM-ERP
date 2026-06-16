import { prisma } from './lib/prisma';

async function main() {
  const damage = await prisma.inventoryDamage.findUnique({
    where: { id: "cmqg1ebnk0001cknubee78d41" }
  });
  console.log(damage);
}
main();
