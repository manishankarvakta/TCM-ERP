import * as fs from "fs";
import * as path from "path";

export function checkSystemRequirements(): boolean {
  console.log("🔍 Checking system requirements...");

  // 1. Check Node.js version
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split(".")[0], 10);
  if (majorVersion < 20) {
    console.error(`❌ Error: Node.js version must be 20 or higher. Current version: ${nodeVersion}`);
    return false;
  }
  console.log(`✅ Node.js version is compatible: ${nodeVersion}`);

  // 2. Check for .env file existence
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file is missing. Please copy .env.example to .env and configure it.");
    return false;
  }
  console.log("✅ .env file exists.");

  // 3. Check for required env variables
  // We can load them using process.env (assuming dotenv is already configured, but we can do a raw parse to be safe or rely on process.env)
  // Let's import dotenv inside this function just to check it
  try {
    require("dotenv").config();
  } catch (e) {
    // If running standalone, dot env might not be loaded yet, we can parse manually
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach(line => {
      const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
        process.env[key] = val;
      }
    });
  }

  const requiredEnvVars = [
    "LIVE_SERVER_BASE_URL",
    "GATEWAY_ID",
    "GATEWAY_API_KEY"
  ];

  let missingVars = false;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Error: Required environment variable ${envVar} is missing or empty in .env`);
      missingVars = true;
    }
  }

  if (missingVars) {
    return false;
  }

  console.log("✅ All required environment variables are set.");
  return true;
}

// Allow running directly
if (require.main === module) {
  const ok = checkSystemRequirements();
  process.exit(ok ? 0 : 1);
}
