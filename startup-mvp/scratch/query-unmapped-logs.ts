import { prisma } from "../lib/prisma";

async function queryUnmapped() {
  const pin = "1382";
  console.log(`🔍 Checking unmapped biometric logs for PIN: ${pin}...`);
  try {
    const unmapped = await prisma.unmappedBiometricLog.findMany({
      where: { deviceUserId: pin },
      orderBy: { punchTime: "desc" }
    });
    console.log("Unmapped logs:", JSON.stringify(unmapped, null, 2));

    // Also let's list all biometric sync logs from today to see if there were errors
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const syncLogs = await prisma.biometricSyncLog.findMany({
      where: { createdAt: { gte: today } },
      orderBy: { createdAt: "desc" }
    });
    console.log("\nToday's Biometric Sync Logs:");
    console.log(JSON.stringify(syncLogs, null, 2));
  } catch (error) {
    console.error("Error querying unmapped logs:", error);
  }
}

queryUnmapped();
