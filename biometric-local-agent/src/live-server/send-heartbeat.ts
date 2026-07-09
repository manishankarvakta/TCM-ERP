import { config } from "../config";
import { logger } from "../logger";

export interface HeartbeatPayload {
  gatewayId: string;
  status: "ONLINE" | "OFFLINE";
  localTime: string;
  version: string;
  pendingLogs: number;
  failedLogs: number;
  activeDevices: number;
}

export async function sendHeartbeat(payload: Omit<HeartbeatPayload, "gatewayId" | "localTime" | "version">): Promise<{ success: boolean; error: string | null }> {
  const url = `${config.liveServerBaseUrl}/api/biometric/gateway/heartbeat`;
  logger.info(`Sending heartbeat status to live server: ${url}`);

  const fullPayload: HeartbeatPayload = {
    ...payload,
    gatewayId: config.gatewayId,
    localTime: new Date().toISOString(),
    version: "1.0.0"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.gatewayApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(fullPayload)
    });

    if (response.status !== 200) {
      const contentType = response.headers.get("content-type") || "";
      let errorMsg = response.statusText || "Error";
      if (!contentType.includes("text/html")) {
        const text = await response.text().catch(() => "");
        if (text) errorMsg = text.slice(0, 150);
      }
      return {
        success: false,
        error: `Server responded with status ${response.status}: ${errorMsg}`
      };
    }

    const data = await response.json().catch(() => ({ success: true })) as any;
    if (data && data.success === false) {
      return {
        success: false,
        error: data.error || "Server rejected heartbeat payload"
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    logger.warn(`Failed to transmit heartbeat to live ERP: ${err.message}`);
    return { success: false, error: err.message || "Network request failed" };
  }
}
