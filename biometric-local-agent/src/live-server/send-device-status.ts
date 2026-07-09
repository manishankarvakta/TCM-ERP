import { config } from "../config";
import { logger } from "../logger";

export interface DeviceStatusReport {
  deviceId: string;
  vendor: string;
  reachable: boolean;
  lastCheckedAt: string;
  lastError: string | null;
}

export interface GatewayDeviceStatusPayload {
  gatewayId: string;
  devices: DeviceStatusReport[];
}

export async function sendDeviceStatus(reports: DeviceStatusReport[]): Promise<{ success: boolean; error: string | null }> {
  const url = `${config.liveServerBaseUrl}/api/biometric/gateway/device-status`;
  logger.info(`Sending device status reports to live server: ${url}`);

  const payload: GatewayDeviceStatusPayload = {
    gatewayId: config.gatewayId,
    devices: reports
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.gatewayApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
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
        error: data.error || "Server rejected device status payload"
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    logger.warn(`Failed to transmit device status to live ERP: ${err.message}`);
    return { success: false, error: err.message || "Network request failed" };
  }
}
