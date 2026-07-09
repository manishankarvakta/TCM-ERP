import * as fs from "fs";
import * as path from "path";

export function ensureFoldersExist(dataDir: string = "./data", logDir: string = "./logs"): void {
  console.log("📂 Ensuring required data and log folders exist...");

  const absDataDir = path.resolve(process.cwd(), dataDir);
  const absLogDir = path.resolve(process.cwd(), logDir);

  if (!fs.existsSync(absDataDir)) {
    fs.mkdirSync(absDataDir, { recursive: true });
    console.log(`📁 Created data directory at: ${absDataDir}`);
  } else {
    console.log(`✅ Data directory already exists: ${absDataDir}`);
  }

  if (!fs.existsSync(absLogDir)) {
    fs.mkdirSync(absLogDir, { recursive: true });
    console.log(`📁 Created log directory at: ${absLogDir}`);
  } else {
    console.log(`✅ Log directory already exists: ${absLogDir}`);
  }
}

// Allow running directly
if (require.main === module) {
  // Simple fallback check
  const data = process.env.DATA_DIR || "./data";
  const logs = process.env.LOG_DIR || "./logs";
  ensureFoldersExist(data, logs);
}
