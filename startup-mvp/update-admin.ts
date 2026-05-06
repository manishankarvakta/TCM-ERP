
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Checking users in database...");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  });

  if (users.length === 0) {
    console.log("No users found. Creating default admin...");
    const passwordHash = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@example.com",
        password: passwordHash,
        role: "admin",
        status: "active",
      }
    });
    console.log(`Created admin: ${admin.email} / admin123`);
  } else {
    console.log(`Found ${users.length} users. Resetting all to 'admin123' for recovery...`);
    const passwordHash = await bcrypt.hash("admin123", 12);
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash }
      });
      console.log(`Updated user: ${user.email} (Password is now: admin123)`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
