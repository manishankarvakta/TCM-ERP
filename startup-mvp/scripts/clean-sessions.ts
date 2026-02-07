import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanSessions() {
  console.log("Cleaning Sessions...");
  try {
    await prisma.session.deleteMany({});
    console.log("✅ Sessions cleaned.");
  } catch (error) {
    console.error("❌ Failed to clean sessions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSessions();
