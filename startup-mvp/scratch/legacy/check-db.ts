import { prisma } from "./lib/prisma";

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: "admin@example.com" } // Assuming this is the test user
  });
  console.log("User:", user);
  
  if (user) {
    const perms = await prisma.permission.findMany({
      where: { userId: user.id, permissionKey: "hr.attendance" }
    });
    console.log("Permissions:", perms);
  }

  const devices = await prisma.biometricDevice.findMany();
  console.log("Devices count:", devices.length);
  console.log("Devices:", devices);
}

check();
