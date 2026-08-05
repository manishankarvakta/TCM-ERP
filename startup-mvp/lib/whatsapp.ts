import { prisma } from "@/lib/prisma";

/**
 * Resolves Meta & WhatsApp API credentials from database settings,
 * falling back to process.env variables if database settings are not set.
 */
export async function getMetaCredentials() {
  const setting = await prisma.settings.findFirst({
    where: { category: "integrations", code: "meta_credentials", is_active: true }
  });
  
  const dbSettings = (setting?.settings as any) || {};

  return {
    FB_APP_SECRET: dbSettings.fbAppSecret || process.env.FB_APP_SECRET,
    FB_VERIFY_TOKEN: dbSettings.fbVerifyToken || process.env.FB_VERIFY_TOKEN,
    FB_PAGE_ACCESS_TOKEN: dbSettings.fbPageAccessToken || process.env.FB_PAGE_ACCESS_TOKEN,
    WHATSAPP_VERIFY_TOKEN: dbSettings.whatsappVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_ACCESS_TOKEN: dbSettings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: dbSettings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_BUSINESS_ACCOUNT_ID: dbSettings.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  };
}

/**
 * Sends a WhatsApp message reply using the WhatsApp Cloud API.
 * POST https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages
 * 
 * @param to The recipient's phone number in international format (e.g., "15555550115")
 * @param text The text body message to send
 * @returns Response data from the Meta Graph API
 */
export async function sendWhatsAppMessage(to: string, text: string) {
  const creds = await getMetaCredentials();
  const accessToken = creds.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = creds.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Missing WhatsApp Cloud API configurations. " +
      "Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in env vars or CRM settings."
    );
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[WhatsApp API] Failed to send message to ${to}. HTTP Status: ${response.status}`, errorText);
    throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[WhatsApp API] Message successfully sent to ${to}:`, data);
  return data;
}
