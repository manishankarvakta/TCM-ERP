
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@admin.com';
  const password = 'password123';
  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      status: 'active',
    },
    create: {
      email,
      name: 'Admin User',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    },
  });

  console.log(`✅ Admin user created/updated: ${user.email}`);
  console.log(`🔑 Login with: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
