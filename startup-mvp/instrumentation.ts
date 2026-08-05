export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.npm_lifecycle_event !== "build") {
    console.log("🚀 [System] Initializing background queue workers...");
    try {
      await import("./lib/hr/biometric/worker");
      console.log("✅ [System] Biometric worker initialized.");
    } catch (err) {
      console.error("❌ [System] Failed to initialize Biometric worker:", err);
    }

    try {
      await import("./lib/system/ai-worker");
      console.log("✅ [System] AI worker initialized.");
    } catch (err) {
      console.error("❌ [System] Failed to initialize AI worker:", err);
    }

    try {
      const { initBackupScheduler } = await import("./lib/backup/scheduler");
      await initBackupScheduler();
      console.log("✅ [System] Backup scheduler initialized.");
    } catch (err) {
      console.error("❌ [System] Failed to initialize Backup scheduler:", err);
    }
  }
}
