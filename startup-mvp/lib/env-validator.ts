const REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "BACKUP_ENCRYPTION_KEY",
  "INTEGRATION_ENCRYPTION_KEY",
];

/**
 * Validates mandatory environment variables.
 * Halt startup with a secure exception to prevent starting in an insecure state.
 */
export function validateEnv(): void {
  // Skip validation during Next.js build phase, static export, or testing
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export" ||
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  const missing: string[] = [];
  
  for (const env of REQUIRED_ENV) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }
  
  if (missing.length > 0) {
    const errorMsg = `CRITICAL CONFIGURATION ERROR: Missing mandatory environment variables: ${missing.join(", ")}. System halting to prevent insecure execution.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Trigger validation on load
validateEnv();
export default validateEnv;
