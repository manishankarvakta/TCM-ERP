import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const newPassword = "password123";
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  console.log("[Reset] Looking for admin user...");

  // 1. Try to find an existing admin@example.com
  let user = await prisma.user.findFirst({
    where: { email }
  });

  if (user) {
    console.log(`[Reset] Found existing user: ${user.email} (ID: ${user.id}). Updating password and status...`);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: "active"
      }
    });
    console.log(`[Reset] Successfully updated user ${email}.`);
    return;
  }

  // 2. Look for the renamed/old seed user by ID
  const seedUserId = "cmj9sd9xq0000o1010acd1hsq";
  const seedUser = await prisma.user.findUnique({
    where: { id: seedUserId }
  });

  if (seedUser) {
    console.log(`[Reset] Found seed admin user by ID: ${seedUser.email}. Restoring email, status, and password...`);
    await prisma.user.update({
      where: { id: seedUserId },
      data: {
        email: email,
        password: hashedPassword,
        status: "active"
      }
    });
    console.log(`[Reset] Successfully restored seed user as ${email}.`);
    return;
  }

  // 3. Look for any user with admin+old email
  const oldUser = await prisma.user.findFirst({
    where: {
      email: {
        startsWith: "admin+old"
      }
    }
  });

  if (oldUser) {
    console.log(`[Reset] Found renamed admin user by email pattern: ${oldUser.email}. Restoring email, status, and password...`);
    await prisma.user.update({
      where: { id: oldUser.id },
      data: {
        email: email,
        password: hashedPassword,
        status: "active"
      }
    });
    console.log(`[Reset] Successfully restored user as ${email}.`);
    return;
  }

  // 4. Create new admin user if none found
  console.log(`[Reset] No admin user found. Creating a new admin user...`);
  await prisma.user.create({
    data: {
      id: seedUserId,
      name: "Admin User",
      email: email,
      password: hashedPassword,
      role: "admin",
      status: "active",
    }
  });
  console.log(`[Reset] Successfully created new admin user ${email}.`);
}

main()
  .catch((e) => {
    console.error("[Reset] Error resetting password:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
