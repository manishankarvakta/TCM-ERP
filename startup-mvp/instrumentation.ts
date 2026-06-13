export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeBackupCron } = await import('./lib/backup/scheduler');
    await initializeBackupCron();
  }
}
