import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const newPassword = 'password123'; // Change this to whatever password you prefer
  
  console.log(`Starting password reset for ${email}...`);

  const hash = await bcrypt.hash(newPassword, 10);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hash },
    });
    console.log(`✅ Successfully reset password for user: ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to reset password. Are you sure a user with email ${email} exists?`);
    console.error(error);
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
