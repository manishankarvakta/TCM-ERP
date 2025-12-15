import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeUserAdmin() {
  // Get email from command line argument
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Please provide an email address");
    console.log("Usage: npx ts-node scripts/make-user-admin.ts <email>");
    process.exit(1);
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log("\n📋 Current user details:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Current Role: ${user.role}`);

    // Update user role to admin
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });

    console.log("\n✅ User updated successfully!");
    console.log(`   New Role: ${updatedUser.role}`);
    console.log("\n💡 Please logout and login again for changes to take effect.\n");
  } catch (error) {
    console.error("❌ Error updating user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserAdmin();

