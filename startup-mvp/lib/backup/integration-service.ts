import { prisma } from "@/lib/prisma";
import { createReadStream } from "fs";
import { format } from "date-fns";

export async function syncBackupToDrive(filePath: string, filename: string): Promise<string | null> {
  try {
    const { google } = await import("googleapis");
    const driveConfigs = await prisma.settings.findMany({
      where: { category: "backup_drive", is_active: true }
    });

    const activeConfig = driveConfigs.find((c: any) => {
      const json = c.settings as any;
      return json && json.isActive === true;
    });

    if (!activeConfig) {
      console.log("[Backup Integration] No active Google Drive configuration found.");
      return null;
    }

    const { folderId, serviceAccountJson } = activeConfig.settings as any;

    if (!folderId || !serviceAccountJson) {
      console.warn("[Backup Integration] Active Google Drive configuration is missing folderId or credentials.");
      return null;
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (e) {
      console.error("[Backup Integration] Failed to parse serviceAccountJson:", e);
      return null;
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const driveService = google.drive({ version: "v3", auth });
    
    console.log(`[Backup Integration] Uploading ${filename} to Google Drive folder ${folderId}...`);
    
    const response = await driveService.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: "application/zip",
        body: createReadStream(filePath),
      },
      fields: "id",
    });

    const fileId = response.data.id || null;
    console.log(`[Backup Integration] Successfully uploaded to Drive. File ID: ${fileId}`);
    return fileId;
  } catch (error: any) {
    console.error("[Backup Integration] Google Drive sync failed:", error.message || error);
    return null;
  }
}

export async function sendBackupTelegramNotification(
  success: boolean,
  type: string,
  filename: string,
  fileSizeStr: string,
  driveFileId?: string | null,
  errorMessage?: string
): Promise<void> {
  try {
    const telegramConfigs = await prisma.settings.findMany({
      where: { category: "backup_telegram", is_active: true }
    });

    const activeConfig = telegramConfigs.find((c: any) => {
      const json = c.settings as any;
      return json && json.isActive === true;
    });

    if (!activeConfig) {
      return;
    }

    const { botToken, chatId } = activeConfig.settings as any;
    if (!botToken || !chatId) {
      return;
    }

    const emoji = success ? "✅" : "❌";
    const dateStr = format(new Date(), "dd/MM/yyyy, h:mm a");
    const driveText = driveFileId ? `\n*Drive ID*: \`${driveFileId}\`` : "";
    const errorText = !success && errorMessage ? `\n*Error*: \`${errorMessage}\`` : "";
    const sizeText = success ? `\n*Size*: ${fileSizeStr}` : "";

    const message = `${emoji} *System Backup Notification*\n\n*Type*: ${type}\n*Status*: ${success ? "Success" : "Failed"}\n*File*: \`${filename}\`\n*Date*: ${dateStr}${sizeText}${driveText}${errorText}`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API responded with ${res.status}: ${errText}`);
    }

    console.log("[Backup Integration] Telegram notification sent successfully.");
  } catch (error: any) {
    console.error("[Backup Integration] Failed to send Telegram notification:", error.message || error);
  }
}
