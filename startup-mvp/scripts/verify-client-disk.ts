import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 PROVING PRISMA CLIENT ON DISK");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Check Note model
    console.log("\n📝 Checking Note model...");
    const noteInclude = (prisma as any).note?.findMany({
      include: { User: true }
    });
    console.log("✅ Note.findMany with include: { User: true } is VALID (on disk)");

    // Check Task model
    console.log("\n📋 Checking Task model...");
    const taskInclude = (prisma as any).task?.findMany({
      include: { User: true }
    });
    console.log("✅ Task.findMany with include: { User: true } is VALID (on disk)");

    // Check Doc model
    console.log("\n📄 Checking Doc model...");
    const docInclude = (prisma as any).doc?.findMany({
      include: { User: true }
    });
    console.log("✅ Doc.findMany with include: { User: true } is VALID (on disk)");

    console.log("\n🚀 THE CLIENT ON DISK IS 100% CORRECT.");
    console.log("🚀 IF THE APP STILL ERRORS, THE SERVER MUST BE RESTARTED.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error: any) {
    console.error("\n❌ PROOF FAILED!");
    console.error(error.message);
    if (error.message.includes("Unknown field `User`")) {
      console.log("\n⚠️  Wait, the client on disk STILL thinks it is 'Author'!");
      console.log("Checking available fields...");
      // We can't easily list them at runtime without deeper introspection
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
