import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { safeFetch } from "./ssrf-protection";
import type { Prisma } from "@prisma/client";

/**
 * Construct safe DTO for domain event payloads to prevent leaking credentials or internal profitability
 */
export function sanitizePayload(aggregateType: string, rawPayload: Record<string, unknown> | null): Record<string, unknown> {
  if (!rawPayload) return {};
  
  const clean = { ...rawPayload };
  
  // Strip common sensitive keys
  const sensitiveKeys = [
    "password", "token", "secret", "credentials", "key", "auth",
    "profit", "margin", "cost", "salary", "recognizedRevenue",
    "internalNote", "privateNote"
  ];
  
  const stripSensitive = (obj: unknown) => {
    if (typeof obj !== "object" || obj === null) return;
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        delete record[key];
      } else if (typeof record[key] === "object") {
        stripSensitive(record[key]);
      }
    }
  };
  
  stripSensitive(clean);
  return clean;
}

/**
 * Dispatch outbound webhooks for a domain event
 */
export async function dispatchOutboundWebhooks(
  organizationId: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown> | null
): Promise<void> {
  // Find all active endpoints subscribed to this event type
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
  });
  
  const subscribedEndpoints = endpoints.filter(
    (ep) => ep.subscribedEvents.includes(eventType) || ep.subscribedEvents.includes("*")
  );
  
  const sanitized = sanitizePayload(eventType, payload);
  
  for (const ep of subscribedEndpoints) {
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(sanitized)).digest("hex");
    
    // Create logical delivery authority
    const delivery = await prisma.webhookDelivery.create({
      data: {
        organizationId,
        endpointId: ep.id,
        eventId,
        eventType,
        payloadHash,
        status: "PENDING",
      },
    });
    
    // Queue job for this delivery
    await prisma.queueJob.create({
      data: {
        organizationId,
        type: "WEBHOOK_DELIVERY",
        referenceId: delivery.id,
        payload: { deliveryId: delivery.id, payload: sanitized } as Prisma.InputJsonValue,
        status: "PENDING",
        maxAttempts: 5,
      },
    });
  }
}

/**
 * Execute actual HTTP delivery to the webhook endpoint
 */
export async function executeWebhookDelivery(deliveryId: string, payload: unknown): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { Endpoint: true },
  });
  
  if (!delivery) {
    throw new Error(`WebhookDelivery ${deliveryId} not found`);
  }
  
  if (delivery.Endpoint.status !== "ACTIVE") {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED" },
    });
    throw new Error(`Webhook endpoint ${delivery.Endpoint.id} is inactive`);
  }
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify(payload || {});
  
  // Calculate HMAC-SHA256 signature
  const signaturePayload = `${timestamp}.${rawBody}`;
  const signature = crypto
    .createHmac("sha256", delivery.Endpoint.secret)
    .update(signaturePayload)
    .digest("hex");
    
  const requestHeaders = {
    "Content-Type": "application/json",
    "X-ERP-Event-ID": delivery.eventId,
    "X-ERP-Delivery-ID": deliveryId,
    "X-ERP-Timestamp": timestamp,
    "X-ERP-Signature": signature,
    "X-ERP-Event-Type": delivery.eventType,
  };
  
  const startTime = Date.now();
  let responseStatus = 0;
  let responseBody = "";
  const responseHeaders: Record<string, string> = {};
  let errorSummary: string | null = null;
  
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "PENDING",
      startedAt: new Date(),
    },
  });
  
  try {
    // Deliver using safeFetch (SSRF and DNS rebinding protected)
    const response = await safeFetch(delivery.Endpoint.url, {
      method: "POST",
      headers: requestHeaders,
      body: rawBody,
    });
    
    responseStatus = response.status;
    responseBody = await response.text();
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    if (response.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SUCCEEDED",
          responseStatus,
          responseBodySummary: responseBody.substring(0, 1000),
          completedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
    }
  } catch (err: unknown) {
    errorSummary = err instanceof Error ? err.message : String(err);
    
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        responseStatus: responseStatus || null,
        responseBodySummary: responseBody ? responseBody.substring(0, 1000) : (errorSummary || "Unknown network error"),
        completedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });
    
    throw err;
  } finally {
    const durationMs = Date.now() - startTime;
    
    // Log physical attempt
    await prisma.webhookDeliveryAttempt.create({
      data: {
        organizationId: delivery.organizationId,
        deliveryId,
        attempt: delivery.attemptCount + 1,
        requestHeaders: requestHeaders as Record<string, string>,
        requestBody: rawBody,
        responseHeaders: responseHeaders as Record<string, string>,
        responseBody: responseBody.substring(0, 10000),
        responseStatus: responseStatus || null,
        durationMs,
        errorSummary,
      },
    });
  }
}
