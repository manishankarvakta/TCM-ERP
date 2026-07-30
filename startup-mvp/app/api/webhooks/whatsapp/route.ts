import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { WebhookQueueService } from "@/lib/system/webhook-queue";
import { getMetaCredentials } from "@/lib/whatsapp";

/**
 * GET Handler: Verifies WhatsApp webhook handshake token
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const creds = await getMetaCredentials();
  const verifyToken = creds.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN is not configured in env vars or CRM settings.");
    return new NextResponse("Server Configuration Error", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Handshake verified successfully.");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification failed. Invalid verify token.");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Timing-safe HMAC SHA256 signature verification helper (shared app secret)
 */
function verifyRequestSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  
  const signature = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const computedSignature = hmac.digest("hex");
  
  const signatureBuffer = Buffer.from(signature, "hex");
  const computedBuffer = Buffer.from(computedSignature, "hex");
  
  if (signatureBuffer.length !== computedBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
}

/**
 * POST Handler: Receives and processes WhatsApp messages & statuses
 */
export async function POST(request: Request) {
  try {
    const creds = await getMetaCredentials();
    const appSecret = creds.FB_APP_SECRET;
    if (!appSecret) {
      console.error("[WhatsApp Webhook] FB_APP_SECRET is not configured in env vars or CRM settings.");
      return new NextResponse("Server Configuration Error", { status: 500 });
    }

    const signatureHeader = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();

    // Verify Meta Request Signature
    if (!verifyRequestSignature(rawBody, signatureHeader, appSecret)) {
      console.warn("[WhatsApp Webhook] Signature verification failed.");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[WhatsApp Webhook] Event received:", JSON.stringify(body));

    if (body.object === "whatsapp_business_account" && body.entry) {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const value = change.value;
          if (!value) continue;

          // 1. Process Messages (incoming messages from customers)
          if (value.messages) {
            for (const msg of value.messages) {
              const from = msg.from;
              const messageId = msg.id;
              const messageType = msg.type;
              const messageBody = msg.text?.body || `[Sent a ${msg.type} message]`;
              
              // Resolve sender contact profile name
              const profileName = value.contacts?.find((c: any) => c.wa_id === from)?.profile?.name || 
                                  value.contacts?.[0]?.profile?.name || 
                                  null;

              const payload = {
                from,
                messageId,
                messageType,
                messageBody,
                profileName,
                raw: msg
              };

              try {
                // Idempotent webhook check using unique messageId
                const existingEvent = await prisma.webhookEvent.findUnique({
                  where: { eventId: messageId }
                });

                if (!existingEvent) {
                  const event = await prisma.webhookEvent.create({
                    data: {
                      source: "whatsapp",
                      eventId: messageId,
                      payload: payload
                    }
                  });

                  await WebhookQueueService.enqueue("PROCESS_WHATSAPP_MESSAGE", event.id);
                  console.log(`[WhatsApp Webhook] Enqueued WhatsApp message ${messageId}`);
                } else {
                  console.log(`[WhatsApp Webhook] Message ${messageId} already exists, skipping duplicate queue.`);
                }
              } catch (dbError) {
                console.error(`[WhatsApp Webhook] DB error handling message ${messageId}:`, dbError);
              }
            }
          }

          // 2. Process Statuses (message delivery reports)
          if (value.statuses) {
            for (const statusObj of value.statuses) {
              const statusId = statusObj.id;
              const statusVal = statusObj.status; // e.g., "sent", "delivered", "read"
              const recipientId = statusObj.recipient_id;
              const eventId = `whatsapp-status:${statusId}:${statusVal}`;

              const payload = {
                id: statusId,
                status: statusVal,
                recipient_id: recipientId,
                raw: statusObj
              };

              try {
                // Idempotent webhook check using eventId status combination
                const existingEvent = await prisma.webhookEvent.findUnique({
                  where: { eventId }
                });

                if (!existingEvent) {
                  const event = await prisma.webhookEvent.create({
                    data: {
                      source: "whatsapp",
                      eventId,
                      payload: payload
                    }
                  });

                  await WebhookQueueService.enqueue("PROCESS_WHATSAPP_STATUS", event.id);
                  console.log(`[WhatsApp Webhook] Enqueued WhatsApp status update ${eventId}`);
                } else {
                  console.log(`[WhatsApp Webhook] Status event ${eventId} already exists, skipping duplicate queue.`);
                }
              } catch (dbError) {
                console.error(`[WhatsApp Webhook] DB error handling status event ${eventId}:`, dbError);
              }
            }
          }
        }
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Unhandled exception processing route:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
