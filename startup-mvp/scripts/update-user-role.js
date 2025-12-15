// Quick script to update user role to admin
// Usage: node scripts/update-user-role.js <email> <role>

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateUserRole() {
  const email = process.argv[2];
  const role = process.argv[3] || "admin";

  if (!email) {
    console.error("❌ Please provide an email address");
    console.log("\nUsage: node scripts/update-user-role.js <email> [role]");
    console.log("Example: node scripts/update-user-role.js user@example.com admin");
    process.exit(1);
  }

  try {
    // Find and update user
    const user = await prisma.user.update({
      where: { email },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    console.log("\n✅ User updated successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`🔑 Role: ${user.role}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Please logout and login again for changes to take effect.\n");
  } catch (error) {
    if (error.code === "P2025") {
      console.error(`\n❌ User not found with email: ${email}\n`);
    } else {
      console.error("\n❌ Error updating user:", error.message, "\n");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();

