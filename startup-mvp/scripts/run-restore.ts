import dotenv from "dotenv";
dotenv.config();

import { restoreDatabaseBackup } from "../lib/backup/restore";
import { getRestoreManager } from "../lib/backup/restore-manager";

async function main() {
  const backupId = "backup-20260828-135853";
  const manager = getRestoreManager();
  const restoreId = manager.createRestore(backupId);

  console.log(`[Import] Starting restoration of backup: ${backupId} (Restore ID: ${restoreId})`);

  try {
    await restoreDatabaseBackup(backupId, restoreId, {
      cleanDatabase: true,
      skipVerification: false
    });
    console.log("✅ Backup restored successfully!");
  } catch (err) {
    console.error("❌ Backup restoration failed:", err);
    process.exit(1);
  }
}

main();
