import { logger } from "../logger";
import { generateDigestHeader } from "../utils/digest-auth";
import { NormalizedPunch } from "./zkteco-adapter";

export class HikvisionAdapter {
  /**
   * Helper to perform fetch requests with Digest Authentication
   */
  private static async fetchWithDigest(
    url: string,
    options: RequestInit,
    username?: string,
    password?: string
  ): Promise<Response> {
    // 1. Initial request
    let response = await fetch(url, options);
    if (response.status !== 401 || !username || !password) {
      return response;
    }

    const wwwAuth = response.headers.get("www-authenticate");
    if (!wwwAuth || !wwwAuth.toLowerCase().startsWith("digest")) {
      return response;
    }

    // 2. Generate digest auth header
    const urlObj = new URL(url);
    const uri = urlObj.pathname + urlObj.search;
    const authHeader = generateDigestHeader(
      options.method || "GET",
      uri,
      wwwAuth,
      username,
      password
    );

    // 3. Retry with authentication header
    const retryHeaders = new Headers(options.headers || {});
    retryHeaders.set("Authorization", authHeader);
    retryHeaders.set("Content-Type", "application/json");

    const retryOptions: RequestInit = {
      ...options,
      headers: retryHeaders
    };

    return await fetch(url, retryOptions);
  }

  /**
   * Tests connection to the Hikvision device by querying its capabilities or a simple status endpoint
   */
  static async testConnection(
    ipAddress: string,
    port: number = 80,
    username?: string,
    password?: string
  ): Promise<{ success: boolean; error: string | null }> {
    const protocol = port === 443 ? "https" : "http";
    const url = `${protocol}://${ipAddress}:${port}/ISAPI/System/deviceInfo`;
    logger.info(`Testing Hikvision connection at ${url}`);

    try {
      const response = await this.fetchWithDigest(
        url,
        { method: "GET" },
        username,
        password
      );

      if (response.status === 200) {
        return { success: true, error: null };
      } else {
        return {
          success: false,
          error: `HTTP Error ${response.status}: ${response.statusText}`
        };
      }
    } catch (err: any) {
      logger.error(`Hikvision connection test failed for ${ipAddress}:${port}`, err);
      return { success: false, error: err.message || "Connection failed" };
    }
  }

  /**
   * Pulls attendance records from the Hikvision device
   */
  static async pullAttendance(
    ipAddress: string,
    port: number = 80,
    username?: string,
    password?: string,
    startTime?: string // ISO string format
  ): Promise<{ success: boolean; punches: NormalizedPunch[]; error: string | null }> {
    const protocol = port === 443 ? "https" : "http";
    const url = `${protocol}://${ipAddress}:${port}/ISAPI/AccessControl/AcsEvent?format=json`;
    logger.info(`Pulling Hikvision events from ${url} starting from: ${startTime || "beginning"}`);

    // If no startTime is provided, default to today
    const startRange = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endRange = new Date().toISOString();

    const requestBody = {
      AcsEventCond: {
        searchID: "agent-sync-" + Date.now(),
        searchResultPosition: 0,
        maxResults: 1000,
        major: 5,
        minor: 75, // Legal Card Pass
        startTime: startRange,
        endTime: endRange
      }
    };

    try {
      const response = await this.fetchWithDigest(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        },
        username,
        password
      );

      if (response.status !== 200) {
        const text = await response.text().catch(() => "");
        return {
          success: false,
          punches: [],
          error: `HTTP Error ${response.status}: ${response.statusText}. Response: ${text}`
        };
      }

      const data = await response.json() as any;
      const infoList = data?.AcsEvent?.InfoList;

      if (!infoList || !Array.isArray(infoList)) {
        return { success: true, punches: [], error: null };
      }

      const punches: NormalizedPunch[] = infoList
        .filter((event: any) => event.employeeNoString || event.employeeNo)
        .map((event: any) => {
          const timestamp = new Date(event.time);
          return {
            deviceUserId: String(event.employeeNoString || event.employeeNo),
            timestamp,
            punchType: "0", // Default verify
            verifyMode: String(event.currentVerifyMode || "1"),
            workCode: "0",
            rawData: event
          };
        });

      return { success: true, punches, error: null };
    } catch (err: any) {
      logger.error(`Failed to pull Hikvision events from ${ipAddress}:${port}`, err);
      return { success: false, punches: [], error: err.message || "Failed to retrieve logs" };
    }
  }

  /**
   * Pulls users currently registered on the Hikvision device
   */
  static async pullUsers(
    ipAddress: string,
    port: number = 80,
    username?: string,
    password?: string
  ): Promise<{ success: boolean; userIds: string[]; error: string | null }> {
    const protocol = port === 443 ? "https" : "http";
    const url = `${protocol}://${ipAddress}:${port}/ISAPI/AccessControl/UserInfo/Search?format=json`;
    logger.info(`Pulling Hikvision users from ${url}`);

    const requestBody = {
      UserInfoSearchCond: {
        searchID: "agent-users-" + Date.now(),
        searchResultPosition: 0,
        maxResults: 1000
      }
    };

    try {
      const response = await this.fetchWithDigest(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        },
        username,
        password
      );

      if (response.status !== 200) {
        const text = await response.text().catch(() => "");
        return {
          success: false,
          userIds: [],
          error: `HTTP Error ${response.status}: ${response.statusText}. Response: ${text}`
        };
      }

      const data = await response.json() as any;
      const userInfoList = data?.UserInfoSearch?.UserInfo;

      if (!userInfoList || !Array.isArray(userInfoList)) {
        return { success: true, userIds: [], error: null };
      }

      const userIds: string[] = userInfoList
        .filter((u: any) => u.employeeNo)
        .map((u: any) => String(u.employeeNo));

      return { success: true, userIds, error: null };
    } catch (err: any) {
      logger.error(`Failed to pull Hikvision users from ${ipAddress}:${port}`, err);
      return { success: false, userIds: [], error: err.message || "Failed to retrieve users" };
    }
  }
}
