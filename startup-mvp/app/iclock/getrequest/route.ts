import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sn = url.searchParams.get("SN");

  if (sn) {
    await prisma.biometricDevice.updateMany({
      where: { serialNumber: sn },
      data: { lastPingAt: new Date() },
    });
  }

  // Currently we do not have remote commands queued, so just return OK
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
