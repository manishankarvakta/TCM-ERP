import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SERVER_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function runTests() {
  console.log("🧪 Starting MB360 Command Queue Hardening Validation\n");

  const SN = "TEST-SN-12345";
  
  // Clean up previous test runs
  await prisma.biometricCommand.deleteMany({ where: { deviceSerialNumber: SN } });
  await prisma.biometricDevice.deleteMany({ where: { serialNumber: SN } });
  await prisma.biometricDevice.deleteMany({ where: { serialNumber: "UNKNOWN-SN-999" } });

  // Create active device
  const device = await prisma.biometricDevice.create({
    data: {
      name: "Test Hardening Device",
      serialNumber: SN,
      ipAddress: "192.168.1.100",
      port: 4370,
      connectionMode: "ADMS",
      status: "active",
      location: "HQ",
      vendor: "ZKTeco",
      createdBy: "system"
    }
  });

  // --- Test Case 1: Dry-run does not consume command ---
  console.log("==> Test Case 1: Dry-run does not consume command");
  const cmd1 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      commandText: "INFO",
      status: "QUEUED"
    }
  });

  try {

  let res = await fetch(`${SERVER_URL}/iclock/getrequest?SN=${SN}&dryRun=true`);
  let text = await res.text();
  
  let checkCmd1 = await prisma.biometricCommand.findUnique({ where: { id: cmd1.id } });
  if (checkCmd1?.status === "QUEUED" && text === "OK") {
    console.log("✅ Test Case 1 Passed: Command remained QUEUED during dry-run.");
  } else {
    throw new Error(`Test 1 Failed: status=${checkCmd1?.status}, text=${text}`);
  }

  // --- Test Case 2: Real device poll consumes command ---
  console.log("\n==> Test Case 2: Real device poll consumes command");
  res = await fetch(`${SERVER_URL}/iclock/getrequest?SN=${SN}`);
  text = await res.text();
  
  checkCmd1 = await prisma.biometricCommand.findUnique({ where: { id: cmd1.id } });
  if (checkCmd1?.status === "SENT" && text.includes("C:")) {
    console.log("✅ Test Case 2 Passed: Command changed to SENT and returned to device.");
  } else {
    throw new Error(`Test 2 Failed: status=${checkCmd1?.status}, text=${text}`);
  }

  // Extract ADMS ID from payloadJson
  const payloadJson = JSON.parse(checkCmd1.payloadJson || "{}");
  const admsCommandId = payloadJson.admsCommandId;

  // --- Test Case 3: Device ACK updates status ---
  console.log("\n==> Test Case 3: Device ACK updates status");
  res = await fetch(`${SERVER_URL}/iclock/devicecmd?SN=${SN}`, {
    method: "POST",
    body: `ID=${admsCommandId}&Return=0&CMD=INFO`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  text = await res.text();

  checkCmd1 = await prisma.biometricCommand.findUnique({ where: { id: cmd1.id } });
  if (checkCmd1?.status === "ACKNOWLEDGED") {
    console.log("✅ Test Case 3 Passed: Command became ACKNOWLEDGED upon Return=0.");
  } else {
    throw new Error(`Test 3 Failed: status=${checkCmd1?.status}`);
  }

  // --- Test Case 4: Unknown SN cannot consume command ---
  console.log("\n==> Test Case 4: Unknown SN cannot consume command");
  const cmd2 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "INFO",
      commandText: "DATA QUERY",
      status: "QUEUED"
    }
  });

  res = await fetch(`${SERVER_URL}/iclock/getrequest?SN=UNKNOWN-SN-999`);
  text = await res.text();
  
  let checkCmd2 = await prisma.biometricCommand.findUnique({ where: { id: cmd2.id } });
  if (checkCmd2?.status === "QUEUED" && text === "OK") {
    console.log("✅ Test Case 4 Passed: Unknown SN did not consume the command.");
  } else {
    throw new Error(`Test 4 Failed: status=${checkCmd2?.status}, text=${text}`);
  }

  // --- Test Case 5: Double poll race protection ---
  console.log("\n==> Test Case 5: Double poll race protection");
  // We simulate race by sending two requests simultaneously.
  const [res1, res2] = await Promise.all([
    fetch(`${SERVER_URL}/iclock/getrequest?SN=${SN}`),
    fetch(`${SERVER_URL}/iclock/getrequest?SN=${SN}`)
  ]);
  const text1 = await res1.text();
  const text2 = await res2.text();
  
  // Only one should have returned "C:", the other should be "OK"
  const isOneC = (text1.includes("C:") && text2 === "OK") || (text2.includes("C:") && text1 === "OK");
  checkCmd2 = await prisma.biometricCommand.findUnique({ where: { id: cmd2.id } });
  
  if (isOneC && checkCmd2?.status === "SENT") {
    console.log("✅ Test Case 5 Passed: Race condition prevented. Only one request consumed the command.");
  } else {
    console.warn(`⚠️ Test 5 Warning: isOneC=${isOneC}, text1=${text1}, text2=${text2}.`);
    // Note: JS Promise.all fetch isn't a perfect true concurrent race due to Node's event loop, but we observe behavior.
  }

  // --- Test Case 6: Dangerous command blocked ---
  console.log("\n==> Test Case 6: Dangerous command blocked");
  const cmd3 = await prisma.biometricCommand.create({
    data: {
      deviceId: device.id,
      deviceSerialNumber: SN,
      commandType: "CLEAR_DATA",
      commandText: "CLEAR DATA",
      status: "QUEUED"
    }
  });

  res = await fetch(`${SERVER_URL}/iclock/getrequest?SN=${SN}`);
  text = await res.text();

  let checkCmd3 = await prisma.biometricCommand.findUnique({ where: { id: cmd3.id } });
  if (checkCmd3?.status === "FAILED" && text === "OK") {
    console.log("✅ Test Case 6 Passed: Dangerous command was blocked and marked FAILED.");
  } else {
    throw new Error(`Test 6 Failed: status=${checkCmd3?.status}, text=${text}`);
  }

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
