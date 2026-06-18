import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SERVER_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function runTests() {
  console.log("🧪 Starting MB360 Device ACK Hardening Validation\n");

  const SN = "TEST-ACK-SN";
  
  // Clean up
  await prisma.biometricCommand.deleteMany({ where: { deviceSerialNumber: SN } });
  await prisma.biometricDevice.deleteMany({ where: { serialNumber: SN } });
  await prisma.biometricDevice.deleteMany({ where: { serialNumber: "UNKNOWN-ACK-SN" } });

  // Create active device
  const device = await prisma.biometricDevice.create({
    data: {
      name: "Test ACK Device",
      serialNumber: SN,
      ipAddress: "192.168.1.101",
      port: 4370,
      connectionMode: "ADMS",
      status: "active",
      location: "HQ",
      vendor: "ZKTeco",
      createdBy: "system"
    }
  });

  const sendPost = async (sn: string, body: string) => {
    return fetch(`${SERVER_URL}/iclock/devicecmd?SN=${sn}`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
  };

  // --- Test Case 1: Valid ACK ---
  console.log("==> Test Case 1: Valid ACK");
  const cmd1 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      status: "SENT",
      sentAt: new Date(),
      payloadJson: JSON.stringify({ admsCommandId: "1001" })
    }
  });

  try {
  await sendPost(SN, "ID=1001&Return=0&CMD=INFO");
  let checkCmd = await prisma.biometricCommand.findUnique({ where: { id: cmd1.id } });
  if (checkCmd?.status === "ACKNOWLEDGED") console.log("✅ Test Case 1 Passed");
  else throw new Error(`Test 1 Failed: status=${checkCmd?.status}`);

  // --- Test Case 2: Failure ACK ---
  console.log("\n==> Test Case 2: Failure ACK");
  const cmd2 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      status: "SENT",
      sentAt: new Date(),
      payloadJson: JSON.stringify({ admsCommandId: "1002" })
    }
  });
  await sendPost(SN, "ID=1002&Return=-1&CMD=INFO");
  checkCmd = await prisma.biometricCommand.findUnique({ where: { id: cmd2.id } });
  if (checkCmd?.status === "FAILED") console.log("✅ Test Case 2 Passed");
  else throw new Error(`Test 2 Failed: status=${checkCmd?.status}`);

  // --- Test Case 3: ACK for QUEUED command ---
  console.log("\n==> Test Case 3: ACK for QUEUED command");
  const cmd3 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      status: "QUEUED",
      payloadJson: JSON.stringify({ admsCommandId: "1003" })
    }
  });
  await sendPost(SN, "ID=1003&Return=0&CMD=INFO");
  checkCmd = await prisma.biometricCommand.findUnique({ where: { id: cmd3.id } });
  if (checkCmd?.status === "QUEUED") console.log("✅ Test Case 3 Passed");
  else throw new Error(`Test 3 Failed: status=${checkCmd?.status}`);

  // --- Test Case 4: ACK for already acknowledged command ---
  console.log("\n==> Test Case 4: ACK for already acknowledged command");
  const cmd4 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      status: "ACKNOWLEDGED",
      payloadJson: JSON.stringify({ admsCommandId: "1004" })
    }
  });
  await sendPost(SN, "ID=1004&Return=-1&CMD=INFO"); // Attempting to fail an already ACKed cmd
  checkCmd = await prisma.biometricCommand.findUnique({ where: { id: cmd4.id } });
  if (checkCmd?.status === "ACKNOWLEDGED") console.log("✅ Test Case 4 Passed");
  else throw new Error(`Test 4 Failed: status=${checkCmd?.status}`);

  // --- Test Case 5: ACK from wrong SN ---
  console.log("\n==> Test Case 5: ACK from wrong SN");
  const cmd5 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      status: "SENT",
      sentAt: new Date(),
      payloadJson: JSON.stringify({ admsCommandId: "1005" })
    }
  });
  await sendPost("UNKNOWN-ACK-SN", "ID=1005&Return=0&CMD=INFO");
  checkCmd = await prisma.biometricCommand.findUnique({ where: { id: cmd5.id } });
  if (checkCmd?.status === "SENT") console.log("✅ Test Case 5 Passed");
  else throw new Error(`Test 5 Failed: status=${checkCmd?.status}`);

  // --- Test Case 6: Unknown command ID ---
  console.log("\n==> Test Case 6: Unknown command ID");
  await sendPost(SN, "ID=9999&Return=0&CMD=INFO");
  console.log("✅ Test Case 6 Passed (Server handled unknown ID without crashing)");

  // --- Test Case 7: Unparseable response ---
  console.log("\n==> Test Case 7: Unparseable response");
  await sendPost(SN, "GARBAGE_PAYLOAD_NO_ID");
  console.log("✅ Test Case 7 Passed (Server handled unparseable payload without crashing)");

  // --- Test Case 8: Stale ACK ---
  console.log("\n==> Test Case 8: Stale ACK");
  const cmd8 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      status: "SENT",
      sentAt: new Date(Date.now() - (48 * 60 * 60 * 1000)), // 48 hours ago
      payloadJson: JSON.stringify({ admsCommandId: "1008" })
    }
  });
  await sendPost(SN, "ID=1008&Return=0&CMD=INFO");
  checkCmd = await prisma.biometricCommand.findUnique({ where: { id: cmd8.id } });
  if (checkCmd?.status === "SENT") console.log("✅ Test Case 8 Passed: Stale ACK was rejected.");
  else throw new Error(`Test 8 Failed: status=${checkCmd?.status}`);

  } finally {
    // Cleanup
    await prisma.biometricCommand.deleteMany({ where: { deviceSerialNumber: SN } });
    await prisma.biometricDevice.deleteMany({ where: { serialNumber: SN } });
    console.log("\n🧹 Cleanup complete.");
  }
}

runTests().catch(e => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});
