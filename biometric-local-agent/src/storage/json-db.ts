import * as fs from "fs";
import * as path from "path";
import { config } from "../config";
import { logger } from "../logger";

export class JsonDb {
  /**
   * Safely reads a JSON file, returning defaultValue if it doesn't exist or is invalid
   */
  static read<T>(fileName: string, defaultValue: T): T {
    const filePath = path.resolve(process.cwd(), config.dataDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      if (!content.trim()) {
        return defaultValue;
      }
      return JSON.parse(content) as T;
    } catch (e) {
      logger.warn(`Failed to parse JSON file ${fileName}, returning default value`, e);
      return defaultValue;
    }
  }

  /**
   * Writes data to a JSON file atomically using a temporary file and rename strategy
   */
  static write<T>(fileName: string, data: T): boolean {
    const dataDir = path.resolve(process.cwd(), config.dataDir);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, fileName);
    const tempPath = path.join(dataDir, `${fileName}.${Date.now()}.tmp`);

    try {
      // 1. Write to temp file
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, content, "utf8");
      
      // 2. Rename temp file to target file (atomic)
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (e) {
      logger.error(`Failed to write JSON file ${fileName} atomically`, e);
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (unlinkErr) {}
      return false;
    }
  }
}
