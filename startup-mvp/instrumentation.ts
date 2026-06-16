export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeBackupCron } = await import('./lib/backup/scheduler');
    await initializeBackupCron();
    
    // Initialize Biometric Worker
    await import('./lib/hr/biometric/worker');
    console.log("Biometric Worker registered in instrumentation");
  }
}
