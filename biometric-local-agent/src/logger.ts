import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import { config } from "./config";

export const logEmitter = new EventEmitter();

class Logger {
  private logFilePath: string;

  constructor() {
    const logDir = path.resolve(process.cwd(), config.logDir);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFilePath = path.join(logDir, "app.log");
  }

  private write(level: string, message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    let errorStr = "";
    
    if (error) {
      if (error instanceof Error) {
        errorStr = error.stack || error.message;
        formattedMessage += `\n${error.stack}`;
      } else {
        errorStr = JSON.stringify(error);
        formattedMessage += `\n${errorStr}`;
      }
    }
    
    // Log to console
    if (level === "ERROR") {
      console.error(formattedMessage);
    } else if (level === "WARN") {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    // Write to file
    try {
      fs.appendFileSync(this.logFilePath, formattedMessage + "\n", "utf8");
    } catch (e) {
      console.error("Failed to write log to file:", e);
    }

    // Broadcast to SSE clients
    logEmitter.emit("log", { level, message, timestamp, error: errorStr });
  }

  info(message: string): void {
    this.write("INFO", message);
  }

  warn(message: string, error?: any): void {
    this.write("WARN", message, error);
  }

  error(message: string, error?: any): void {
    this.write("ERROR", message, error);
  }
}

export const logger = new Logger();
export default logger;
