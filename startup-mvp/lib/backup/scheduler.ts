import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { createFullBackup, createDatabaseBackup, createFilesBackup } from './create';
import { uploadToGoogleDrive } from './google-drive';
import { getBackupTypeDir } from './config';
import * as path from 'path';
import * as fs from 'fs';

import type { BackupType } from '@/types/backup';

let activeBackupJob: any = null;

export async function initializeBackupCron() {
  console.log('[Backup Scheduler] Initializing backup cron job...');
  
  try {
    const settingsRecord = await prisma.settings.findFirst({
      where: {
        code: 'SYSTEM_BACKUP',
        category: 'BACKUP_SETTINGS',
      },
    });

    if (!settingsRecord || !settingsRecord.isActive) {
      if (activeBackupJob) {
        activeBackupJob.stop();
        activeBackupJob = null;
      }
      return;
    }

    const config = settingsRecord.settings as any;
    
    if (!config?.isAutoBackupEnabled) {
      if (activeBackupJob) {
        activeBackupJob.stop();
        activeBackupJob = null;
      }
      return;
    }

    const backupTime = config.backupTime;
    if (!backupTime || typeof backupTime !== 'string') {
      return;
    }

    const [hour, minute] = backupTime.split(':');
    let cronExpression = `${minute} ${hour} * * *`;
    const frequency = config.backupFrequency || 'daily';
    if (frequency === 'weekly') {
      cronExpression = `${minute} ${hour} * * 0`;
    } else if (frequency === 'monthly') {
      cronExpression = `${minute} ${hour} 1 * *`;
    }

    if (activeBackupJob) {
      activeBackupJob.stop();
    }

    activeBackupJob = cron.schedule(cronExpression, async () => {
      try {
        const backupType = config.backupType || 'full';
        const options = {
          type: backupType as BackupType,
          description: 'Automated Scheduled Backup',
          encrypt: false,
        };

        let metadata;
        if (backupType === 'database') {
          metadata = await createDatabaseBackup(options);
        } else if (backupType === 'files') {
          metadata = await createFilesBackup(options);
        } else {
          metadata = await createFullBackup(options);
        }
        
        if (config.googleServiceAccountJson && config.googleDriveFolderId) {
          const backupFileName = `backup-${backupType}-${metadata.id}.zip`;
          const backupFilePath = path.join(getBackupTypeDir(backupType), backupFileName);

          if (fs.existsSync(backupFilePath)) {
            await uploadToGoogleDrive(
              backupFilePath,
              config.googleDriveFolderId,
              config.googleServiceAccountJson
            );
          }
        }

        if (frequency === 'once') {
          // Disable auto backup after it runs once
          const existingRecord = await prisma.settings.findFirst({
            where: { code: 'SYSTEM_BACKUP', category: 'BACKUP_SETTINGS' }
          });
          if (existingRecord) {
            const mergedSettings = { ...(existingRecord.settings as any || {}), isAutoBackupEnabled: false };
            await prisma.settings.update({
              where: { id: existingRecord.id },
              data: { settings: mergedSettings }
            });
          }
          if (activeBackupJob) {
            activeBackupJob.stop();
            activeBackupJob = null;
          }
        }
      } catch (error) {
        console.error('[Backup Scheduler] Scheduled backup failed:', error);
      }
    });

  } catch (error) {
    console.error('[Backup Scheduler] Failed to initialize cron job:', error);
  }
}

export async function getSchedulerStatus() {
  return {
    isRunning: activeBackupJob !== null,
  };
}
