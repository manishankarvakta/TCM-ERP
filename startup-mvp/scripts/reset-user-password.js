const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@techsoulbd.com";
  const newPassword = process.argv[3] || "Admin123!";

  console.log(`[Password Reset] Target user: ${email}`);
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const updatedCount = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "password" = $1, "status" = 'active' WHERE LOWER("email") = LOWER($2)`,
    hashedPassword,
    email
  );

  if (updatedCount > 0) {
    console.log(`✅ Successfully updated password for user "${email}" to: "${newPassword}"`);
  } else {
    const newId = `user-${Date.now()}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" ("id", "name", "email", "password", "role", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'admin', 'active', NOW(), NOW())`,
      newId,
      "Admin User",
      email,
      hashedPassword
    );
    console.log(`✅ Created new active admin user "${email}" with password: "${newPassword}"`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to reset password:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
