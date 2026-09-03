import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { decryptCredentials } from "@/lib/integration-encryption";

/**
 * POST /api/integrations/inbound
 * Inbound webhook processor with signature verification and replay prevention.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId parameter" }, { status: 400 });
  }
  
  // 1. Load connection details
  const connection = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
  });
  
  if (!connection) {
    return NextResponse.json({ error: "Integration connection not found" }, { status: 404 });
  }
  
  if (connection.status !== "ACTIVE") {
    return NextResponse.json({ error: "Integration connection is not active" }, { status: 400 });
  }
  
  // 2. Extract headers
  const externalEventId = req.headers.get("x-erp-event-id");
  const timestampStr = req.headers.get("x-erp-timestamp");
  const incomingSignature = req.headers.get("x-erp-signature");
  const eventType = req.headers.get("x-erp-event-type") || "inbound.event";
  
  if (!externalEventId || !timestampStr || !incomingSignature) {
    return NextResponse.json({ error: "Missing required signature/event headers" }, { status: 401 });
  }
  
  // 3. Replay Protection - Timestamp Window
  const timestamp = parseInt(timestampStr, 10);
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (isNaN(timestamp) || Math.abs(nowEpoch - timestamp) > 300) {
    return NextResponse.json({ error: "Stale timestamp - request rejected" }, { status: 401 });
  }
  
  // 4. Retrieve Webhook Secret from encryptedCredentials
  let webhookSecret = "";
  try {
    if (connection.encryptedCredentials) {
      const creds = JSON.parse(decryptCredentials(connection.encryptedCredentials));
      webhookSecret = creds.webhookSecret || "";
    }
  } catch {
    return NextResponse.json({ error: "Failed to decrypt connection credentials" }, { status: 500 });
  }
  
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured on connection" }, { status: 400 });
  }
  
  // 5. Signature Verification
  const rawBody = await req.text();
  const signaturePayload = `${timestampStr}.${rawBody}`;
  const calculatedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signaturePayload)
    .digest("hex");
    
  if (calculatedSignature !== incomingSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  
  // 6. DB-backed Event Replay & Deduplication
  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const organizationId = connection.organizationId; // Trust connection, NOT payload
  
  try {
    // Check if event already exists to prevent duplicate processing
    const existing = await prisma.integrationEvent.findUnique({
      where: {
        organizationId_connectionId_externalEventId: {
          organizationId,
          connectionId,
          externalEventId,
        },
      },
    });
    
    if (existing) {
      return NextResponse.json({ error: "Replayed event ID - duplicate transaction blocked" }, { status: 409 });
    }
    
    // Check if there is an event with the same payload hash to prevent replay of different payload content
    const existingHash = await prisma.integrationEvent.findFirst({
      where: {
        organizationId,
        connectionId,
        payloadHash,
      },
    });
    
    if (existingHash && existingHash.externalEventId !== externalEventId) {
      return NextResponse.json({ error: "Event payload collision blocked" }, { status: 409 });
    }
    
    // Parse body payload safely
    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    
    // Transactionally log the verified event and queue its processing
    const event = await prisma.$transaction(async (tx) => {
      const evt = await tx.integrationEvent.create({
        data: {
          organizationId,
          connectionId,
          externalEventId,
          eventType,
          payloadHash,
          payload: parsedPayload,
          status: "RECEIVED",
          verifiedAt: new Date(),
        },
      });
      
      // Queue processing job
      await tx.queueJob.create({
        data: {
          organizationId,
          type: "INBOUND_EVENT_PROCESS",
          referenceId: evt.id,
          payload: { eventId: evt.id },
          status: "PENDING",
        },
      });
      
      return evt;
    });
    
    return NextResponse.json({
      success: true,
      eventId: event.id,
      status: event.status,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Inbound event processing failed: ${errMsg}` }, { status: 500 });
  }
}
