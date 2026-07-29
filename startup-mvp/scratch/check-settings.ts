import { prisma } from "../lib/prisma";
async function run() {
  const settings = await prisma.settings.findMany({});
  console.log(JSON.stringify(settings, null, 2));
}
run();
