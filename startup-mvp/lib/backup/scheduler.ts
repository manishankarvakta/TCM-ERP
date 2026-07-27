import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { createDatabaseBackup, createFilesBackup, createFullBackup } from "./create";
import { syncBackupToDrive, sendBackupTelegramNotification } from "./integration-service";
import { getBackupTypeDir } from "./config";
import { formatBytes } from "./utils";
import path from "path";

let scheduledTask: ScheduledTask | null = null;

export async function initBackupScheduler() {
  console.log("[Backup Scheduler] Initializing...");
  
  // If there's an existing schedule, stop it
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  try {
    // Load active schedule settings from DB
    const scheduleSetting = await prisma.settings.findFirst({
      where: { category: "backup", code: "backup_schedule", is_active: true }
    });

    if (!scheduleSetting) {
      console.log("[Backup Scheduler] No scheduler configuration found in DB.");
      return;
    }

    const settings = scheduleSetting.settings as any;
    if (!settings || !settings.autoBackup) {
      console.log("[Backup Scheduler] Auto-backup is disabled.");
      return;
    }

    const { frequency, time, backupType, syncToDrive } = settings;
    console.log(`[Backup Scheduler] Auto-backup is ENABLED. Frequency: ${frequency}, Time: ${time}, Type: ${backupType}, SyncToDrive: ${syncToDrive}`);

    // Schedule task using node-cron to check every minute
    scheduledTask = cron.schedule("* * * * *", async () => {
      try {
        const currentDay = new Date().getDay(); // 0 (Sunday) to 6
        const currentDate = new Date().getDate(); // 1 to 31
        const currentTime = format(new Date(), "HH:mm");

        // Verify time match
        if (currentTime !== time) return;

        // Verify frequency constraints
        if (frequency === "Week" && currentDay !== 0) return; // Sunday only
        if (frequency === "Month" && currentDate !== 1) return; // 1st of month only

        console.log(`[Backup Scheduler] Triggering automatic backup of type ${backupType}...`);
        
        let metadata;
        const type = backupType.toLowerCase(); // Ensure lowercase match
        
        try {
          if (type === "database") {
            metadata = await createDatabaseBackup({ type: "database", encrypt: false });
          } else if (type === "files") {
            metadata = await createFilesBackup({ type: "files", encrypt: false });
          } else {
            metadata = await createFullBackup({ type: "full", encrypt: false });
          }

          const filename = `${metadata.id}.zip`;
          const dir = getBackupTypeDir(metadata.type);
          const filePath = path.join(dir, filename);
          const sizeStr = formatBytes(metadata.size);

          console.log(`[Backup Scheduler] Auto-backup created successfully: ${filename} (${sizeStr})`);

          let driveFileId = null;
          if (syncToDrive) {
            driveFileId = await syncBackupToDrive(filePath, filename);
          }

          await sendBackupTelegramNotification(true, backupType, filename, sizeStr, driveFileId);
        } catch (backupError: any) {
          console.error("[Backup Scheduler] Auto-backup failed:", backupError);
          await sendBackupTelegramNotification(
            false, 
            backupType, 
            `backup-${format(new Date(), "yyyyMMdd-HHmmss")}.zip`, 
            "0 B", 
            null, 
            backupError.message || String(backupError)
          );
        }
      } catch (err) {
        console.error("[Backup Scheduler] Cron tick error:", err);
      }
    }, {
      timezone: "Asia/Dhaka" // Local system timezone as configured in POS guide
    });

    scheduledTask.start();
    console.log("[Backup Scheduler] Cron job started.");
  } catch (dbError) {
    console.error("[Backup Scheduler] Failed to load settings from database:", dbError);
  }
}
