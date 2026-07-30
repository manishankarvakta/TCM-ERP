/**
 * Sends a WhatsApp message reply using the WhatsApp Cloud API.
 * POST https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages
 * 
 * @param to The recipient's phone number in international format (e.g., "15555550115")
 * @param text The text body message to send
 * @returns Response data from the Meta Graph API
 */
export async function sendWhatsAppMessage(to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Missing WhatsApp Cloud API configurations. " +
      "Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in env vars."
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
