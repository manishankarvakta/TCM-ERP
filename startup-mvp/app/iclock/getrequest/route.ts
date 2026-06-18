import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInMinutes } from "date-fns";

// Safe feature flags for Phase 6 Testing
const BIOMETRIC_COMMANDS_ENABLED = true; 
const BIOMETRIC_ALLOW_UNVERIFIED_COMMANDS = true; 

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sn = url.searchParams.get("SN");

  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => (headersObj[k] = v));

  console.log(`\n[ADMS:getrequest]`);
  console.log(`SN=${sn}`);
  console.log(`Full URL=${req.url}`);
  console.log(`Method=${req.method}`);
  console.log(`Headers=`, JSON.stringify(headersObj));
  
  if (!sn) {
    console.log(`responseText="ERROR: Missing SN"`);
    return new NextResponse("ERROR: Missing SN", { status: 400 });
  }

  // 1. Detect Manual / Script Polling (Dry-Run Mode)
  const isDryRun = url.searchParams.get("dryRun") === "true" || headersObj["x-manual-test"] === "true";
  if (isDryRun) {
    console.log(`[ADMS:getrequest] Manual Test / Dry-Run detected. Will not consume commands.`);
  }

  // 2. Validate real device exists and is active
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: sn } });
  if (!device || device.status !== "active") {
    console.log(`[ADMS:getrequest] Unknown or disabled device SN: ${sn}. Skipping command consumption.`);
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
  }

  // Always update ping status
  await prisma.biometricDevice.updateMany({
    where: { serialNumber: sn },
    data: { lastPingAt: new Date() },
  });

  // Handle command timeouts to prevent infinite blocking queue
  const staleCommands = await prisma.biometricCommand.findMany({
    where: { 
      deviceSerialNumber: sn, 
      status: "SENT" 
    }
  });

  for (const stale of staleCommands) {
    if (stale.sentAt && differenceInMinutes(new Date(), stale.sentAt) >= 5) {
      console.log(`[ADMS-TEST] Command ${stale.id} timed out.`);
      await prisma.biometricCommand.update({
        where: { id: stale.id },
        data: { status: "FAILED", errorMessage: "Command timed out on device execution." }
      });
    }
  }

  // Fetch the oldest QUEUED command
  const pendingCommand = await prisma.biometricCommand.findFirst({
    where: { 
      deviceSerialNumber: sn, 
      status: "QUEUED",
    },
    orderBy: { createdAt: 'asc' }
  });

  if (pendingCommand && pendingCommand.commandText) {
    // Feature Flag Check
    if (!BIOMETRIC_COMMANDS_ENABLED) {
      console.log(`[ADMS-TEST] Skipped command dispatch (BIOMETRIC_COMMANDS_ENABLED=false)`);
      console.log(`responseText="OK"`);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
    }

    // Safety Flag Check
    const isVerifiedCommand = true; // We are in explicit test phase; allow commands
    if (!isVerifiedCommand && !BIOMETRIC_ALLOW_UNVERIFIED_COMMANDS) {
      console.log(`[ADMS-TEST] Skipped unsafe command type ${pendingCommand.commandType} (BIOMETRIC_ALLOW_UNVERIFIED_COMMANDS=false)`);
      console.log(`responseText="OK"`);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
    }

    // 3. Dangerous Command Prevention
    const dangerousKeywords = ["CLEAR", "DELETE", "REBOOT", "FACTORY RESET"];
    const isDangerous = dangerousKeywords.some(k => pendingCommand.commandText?.toUpperCase().includes(k));
    
    if (isDangerous) {
      console.log(`[ADMS-TEST] BLOCKED dangerous command: ${pendingCommand.commandText}`);
      await prisma.biometricCommand.update({
        where: { id: pendingCommand.id },
        data: { status: "FAILED", errorMessage: "Blocked dangerous command by safety policy." }
      });
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
    }

    // 4. Manual Test / Dry-Run Skip
    if (isDryRun) {
      console.log(`[ADMS-TEST] Dry-Run mode. Skipping consumption of command ${pendingCommand.id}`);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
    }

    const payload = pendingCommand.commandText;
    const admsCommandId = Date.now();
    const responseText = `C:${admsCommandId}:${payload}`;

    console.log(`deviceId=${pendingCommand.deviceId}`);
    console.log(`selectedCommandDbId=${pendingCommand.id}`);
    console.log(`admsCommandId=${admsCommandId}`);
    console.log(`responseText="${responseText}"`);

    // 5. Race Condition Protection (Atomic Update)
    const updateResult = await prisma.biometricCommand.updateMany({
      where: { 
        id: pendingCommand.id,
        status: "QUEUED" // Only update if still QUEUED
      },
      data: { 
        status: "SENT",
        sentAt: new Date(),
        payloadJson: JSON.stringify({ admsCommandId })
      }
    });

    if (updateResult.count === 0) {
      console.log(`[ADMS-TEST] Race condition prevented. Command ${pendingCommand.id} already consumed.`);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
    }

    return new NextResponse(responseText, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.log(`responseText="OK"`);
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
