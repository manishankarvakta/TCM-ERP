import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { WebhookQueueService } from "@/lib/system/webhook-queue";
import { getMetaCredentials } from "@/lib/whatsapp";

/**
 * GET Handler: Verifies Meta's webhook handshake token
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const creds = await getMetaCredentials();
  const verifyToken = creds.FB_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[FB Webhook] FB_VERIFY_TOKEN is not configured in env vars or CRM settings.");
    return new NextResponse("Server Configuration Error", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[FB Webhook] Handshake verified successfully.");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[FB Webhook] Verification failed. Invalid verify token.");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Timing-safe HMAC SHA256 signature verification helper
 */
function verifyFBRequestSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  
  // Format is usually: sha256={signature_hex}
  const signature = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  
  const hmac = crypto.createHmac("sha256", appSecret);
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
 * POST Handler: Receives and enqueues lead notifications asynchronously
 */
export async function POST(request: Request) {
  try {
    const creds = await getMetaCredentials();
    const appSecret = creds.FB_APP_SECRET;
    if (!appSecret) {
      console.error("[FB Webhook] FB_APP_SECRET is not configured in env vars or CRM settings.");
      return new NextResponse("Server Configuration Error", { status: 500 });
    }

    const signatureHeader = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();

    // Verify Meta Request Signature
    if (!verifyFBRequestSignature(rawBody, signatureHeader, appSecret)) {
      console.warn("[FB Webhook] Signature verification failed.");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[FB Webhook] Event received:", JSON.stringify(body));

    // Meta Webhooks entries parsing
    if (body.object === "page" && body.entry) {
      for (const entry of body.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const { leadgen_id, form_id, page_id } = change.value || {};
            if (!leadgen_id) continue;

            // Idempotent insertion using leadgen_id
            try {
              const existingEvent = await prisma.webhookEvent.findUnique({
                where: { eventId: leadgen_id }
              });

              if (!existingEvent) {
                const event = await prisma.webhookEvent.create({
                  data: {
                    source: "facebook",
                    eventId: leadgen_id,
                    payload: {
                      leadgen_id,
                      form_id,
                      page_id,
                      change_value: change.value
                    }
                  }
                });

                // Enqueue background processing job
                await WebhookQueueService.enqueue("PROCESS_FACEBOOK_LEAD", event.id);
                console.log(`[FB Webhook] Enqueued event ${leadgen_id} successfully.`);
              } else {
                console.log(`[FB Webhook] Duplicate event ignored for leadgen_id ${leadgen_id}.`);
              }
            } catch (dbError) {
              console.error(`[FB Webhook] DB error handling event ${leadgen_id}:`, dbError);
            }
          }
        }
      }
    }

    // Respond quickly to avoid Meta's webhook timeout limit
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err: any) {
    console.error("[FB Webhook] Unhandled exception processing route:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
