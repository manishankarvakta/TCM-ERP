import { prisma } from "../../lib/prisma";

async function main() {
  console.log("🧹 Deleting test devices to clear test mappings...");
  
  const testSerialNumbers = ["SEED-DEV-999", "TEST-SUITE-DEV", "TEST-UPDATE-DEV"];
  
  try {
    const result = await prisma.biometricDevice.deleteMany({
      where: {
        serialNumber: {
          in: testSerialNumbers
        }
      }
    });
    console.log(`✅ Successfully deleted ${result.count} test devices and all their cascading mappings.`);
  } catch (error) {
    console.error("❌ Failed to delete test devices:", error);
  } finally {
    await prisma.$disconnect();
    console.log("🧹 Cleanup Complete.");
  }
}

main();
