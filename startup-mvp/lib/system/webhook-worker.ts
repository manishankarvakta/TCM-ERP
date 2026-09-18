import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { WebhookJob } from "./webhook-queue";
import { LeadStatus } from "@prisma/client";
import { getMetaCredentials } from "@/lib/whatsapp";

// Self-contained generator for lead numbers to prevent import issues in Worker thread
async function workerGenerateLeadNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LEAD-${year}-`;
  
  const lastLead = await prisma.lead.findFirst({
    where: {
      leadNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      leadNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastLead && lastLead.leadNumber) {
    const lastNumber = parseInt(lastLead.leadNumber.split('-').pop() || '0');
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

export const webhookWorker = new Worker(
  "webhook-jobs",
  async (job: Job<WebhookJob>) => {
    const { type, eventId } = job.data;
    console.log(`[Webhook Worker] Processing job ${job.id} of type ${type} for WebhookEvent ID ${eventId}`);

    // Fetch the event
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      console.error(`[Webhook Worker] WebhookEvent with ID ${eventId} not found`);
      return;
    }

    if (event.processed) {
      console.log(`[Webhook Worker] WebhookEvent ${eventId} has already been processed`);
      return;
    }

    try {
      if (type === "PROCESS_FACEBOOK_LEAD") {
        await processFacebookLead(event);
      } else if (type === "PROCESS_WHATSAPP_MESSAGE") {
        await processWhatsAppMessage(event);
      } else if (type === "PROCESS_WHATSAPP_STATUS") {
        await processWhatsAppStatus(event);
      }

      // Mark event as processed
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true }
      });
      console.log(`[Webhook Worker] Successfully processed WebhookEvent ${event.id}`);
    } catch (error: any) {
      console.error(`[Webhook Worker] Error processing WebhookEvent ${event.id}:`, error);
      throw error; // Let BullMQ retry the job
    }
  },
  {
    connection: redis,
  }
);

webhookWorker.on('error', (err) => {
  // Suppress unhandled error crash when Redis is temporarily offline/reconnecting
});

async function processFacebookLead(event: any) {
  const payload = event.payload as any;
  const leadgenId = payload.leadgen_id;
  const formId = payload.form_id;
  const pageId = payload.page_id;

  const creds = await getMetaCredentials();
  const pageAccessToken = creds.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) {
    throw new Error("FB_PAGE_ACCESS_TOKEN is not configured in env vars or CRM settings");
  }

  // Fetch lead details from Meta Graph API
  const url = `https://graph.facebook.com/v22.0/${leadgenId}?access_token=${pageAccessToken}`;
  console.log(`[Webhook Worker] Fetching lead data from Graph API: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error: ${response.status} - ${errorText}`);
  }

  const fbLead = await response.json();
  console.log(`[Webhook Worker] Graph API response for leadgen_id ${leadgenId}:`, JSON.stringify(fbLead));

  // Parse field_data array into a flat object
  const fieldData = fbLead.field_data || [];
  const flatFields: Record<string, string> = {};
  
  for (const field of fieldData) {
    if (field.name && field.values && field.values.length > 0) {
      flatFields[field.name] = field.values[0];
    }
  }

  // Extract common names/keys
  const email = flatFields.email || null;
  const phone = flatFields.phone_number || flatFields.phone || null;
  const name = flatFields.full_name || 
    (flatFields.first_name && flatFields.last_name ? `${flatFields.first_name} ${flatFields.last_name}` : null) || 
    flatFields.name || 
    `Facebook Lead ${leadgenId}`;

  // Generate lead number
  const leadNumber = await workerGenerateLeadNumber();

  // Create lead record idempotently using externalId
  const result = await prisma.lead.upsert({
    where: { externalId: leadgenId },
    update: {
      name,
      email,
      phone,
      formId,
      pageId,
      rawPayload: fbLead,
    },
// @ts-expect-error - Legacy compatibility
    create: {
      externalId: leadgenId,
      leadNumber,
      name,
      email,
      phone,
      source: "facebook",
      formId,
      pageId,
      status: LeadStatus.NEW,
      rawPayload: fbLead,
    }
  });

  console.log(`[Webhook Worker] Lead record successfully upserted for FB leadgen_id ${leadgenId}:`, result.id);
}

async function processWhatsAppMessage(event: any) {
  const payload = event.payload as any;
  const { from, messageId, messageType, messageBody, profileName } = payload;

  const leadNumber = await workerGenerateLeadNumber();

  // Upsert Lead record by phone number as the unique externalId (ensuring no duplicate contacts)
  const result = await prisma.lead.upsert({
    where: { externalId: from },
    update: {
      name: profileName || undefined,
      messageText: messageBody,
      rawPayload: payload,
    },
// @ts-expect-error - Legacy compatibility
    create: {
      externalId: from,
      leadNumber,
      name: profileName || `WhatsApp User ${from}`,
      phone: from,
      source: "whatsapp",
      messageText: messageBody,
      status: LeadStatus.NEW,
      rawPayload: payload,
    }
  });

  console.log(`[Webhook Worker] Lead record successfully upserted for WhatsApp contact ${from}:`, result.id);
}

async function processWhatsAppStatus(event: any) {
  const payload = event.payload as any;
  const { recipient_id, status, id: messageId } = payload;

  // Find WhatsApp Lead by recipient_id
  const lead = await prisma.lead.findUnique({
    where: { externalId: recipient_id }
  });

  if (!lead) {
    console.log(`[Webhook Worker] No WhatsApp Lead found with phone/externalId ${recipient_id} to update status`);
    return;
  }

  // Update rawPayload metadata to reflect message status
  let updatedPayload = lead.rawPayload ? (typeof lead.rawPayload === 'string' ? JSON.parse(lead.rawPayload) : lead.rawPayload) as any : {};
  if (typeof updatedPayload !== 'object') {
    updatedPayload = {};
  }

  updatedPayload.lastMessageStatus = status;
  updatedPayload.lastMessageId = messageId;
  
  const statusHistory = updatedPayload.statusHistory || [];
  statusHistory.push({
    messageId,
    status,
    timestamp: new Date().toISOString()
  });
  updatedPayload.statusHistory = statusHistory;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      rawPayload: updatedPayload
    }
  });

  console.log(`[Webhook Worker] Lead ${lead.id} message status updated to ${status} for message ${messageId}`);
}
