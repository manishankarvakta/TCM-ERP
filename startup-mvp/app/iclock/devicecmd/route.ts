import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sn = url.searchParams.get("SN");

  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => (headersObj[k] = v));

  const bodyText = await req.text();

  console.log(`\n[ADMS:devicecmd]`);
  console.log(`SN=${sn}`);
  console.log(`Full URL=${req.url}`);
  console.log(`Method=${req.method}`);
  console.log(`Headers=`, JSON.stringify(headersObj));
  console.log(`Raw Body=`, bodyText);

  if (!sn) {
    console.log(`responseText="ERROR: Missing SN"`);
    return new NextResponse("ERROR: Missing SN", { status: 400 });
  }

  // Validate real device exists and is active
  const device = await prisma.biometricDevice.findUnique({ where: { serialNumber: sn } });
  if (!device || device.status !== "active") {
    console.log(`[ADMS:devicecmd] Unknown or disabled device SN: ${sn}. Ignoring ACK.`);
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
  }

  // Update ping status
  await prisma.biometricDevice.updateMany({
    where: { serialNumber: sn },
    data: { lastPingAt: new Date() },
  });

  const parsedParams = new URLSearchParams(bodyText);
  const commandIdMatch = bodyText.match(/ID=([^&]+)/);
  const rawId = commandIdMatch ? commandIdMatch[1] : parsedParams.get("ID");
  const returnCodeMatch = bodyText.match(/Return=([^&]+)/);
  const returnCode = returnCodeMatch ? returnCodeMatch[1] : parsedParams.get("Return");
  const cmdMatch = bodyText.match(/CMD=([^&]+)/);
  const cmdParam = cmdMatch ? cmdMatch[1] : parsedParams.get("CMD");

  console.log(`Extracted ID=${rawId}`);
  console.log(`Extracted Return=${returnCode}`);
  console.log(`Extracted CMD=${cmdParam}`);

  let matchedCommand = null;

  if (rawId) {
    // Priority 1: Match by numeric admsCommandId in payloadJson
    const sentCommands = await prisma.biometricCommand.findMany({
      where: { deviceSerialNumber: sn, status: "SENT" },
      orderBy: { sentAt: 'desc' }
    });

    for (const cmd of sentCommands) {
      if (cmd.payloadJson) {
        try {
          const parsed = JSON.parse(cmd.payloadJson);
          if (parsed.admsCommandId && String(parsed.admsCommandId) === String(rawId)) {
            matchedCommand = cmd;
            break;
          }
        } catch(e) {}
      }
    }
  }

  if (matchedCommand) {
    console.log(`Matched Command DB ID=${matchedCommand.id}`);
    
    // Check for stale command (older than 24 hours)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (matchedCommand.sentAt && (Date.now() - matchedCommand.sentAt.getTime() > ONE_DAY_MS)) {
      console.log(`[ADMS:devicecmd] Stale ACK detected for command ${matchedCommand.id}. Ignored.`);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" }});
    }

    await prisma.biometricCommand.update({
      where: { id: matchedCommand.id },
      data: {
        status: returnCode === "0" ? "ACKNOWLEDGED" : "FAILED",
        resultText: bodyText,
        respondedAt: new Date(),
        errorMessage: returnCode !== "0" ? `Device returned error code: ${returnCode}` : null
      }
    });
  } else {
    console.log(`No matched command found. Storing as ACKNOWLEDGED_UNKNOWN in log.`);
    // We could store it somewhere, but for now we just log it as requested
    console.log(`[ACKNOWLEDGED_UNKNOWN] SN: ${sn} RAW: ${bodyText}`);
  }

  console.log(`responseText="OK"`);
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
