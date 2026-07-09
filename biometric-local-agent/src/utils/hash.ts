import * as crypto from "crypto";

/**
 * Computes MD5 hash of input string
 */
export function md5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

/**
 * Generates a unique hash ID for a biometric punch record
 */
export function generatePunchId(deviceId: string, deviceUserId: string, timestamp: string | Date): string {
  const timeStr = typeof timestamp === "string" ? timestamp : timestamp.toISOString();
  return md5(`${deviceId}_${deviceUserId}_${timeStr}`);
}
