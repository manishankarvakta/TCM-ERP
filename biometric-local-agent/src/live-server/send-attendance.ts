import { config } from "../config";
import { AttendanceCacheRecord } from "../storage/attendance-store";
import { logger } from "../logger";

export async function sendAttendanceBatch(
  vendor: string,
  deviceId: string,
  records: AttendanceCacheRecord[]
): Promise<{ success: boolean; error: string | null }> {
  const url = `${config.liveServerBaseUrl}/api/biometric/sync`;
  logger.info(`Sending batch of ${records.length} punches for device ${deviceId} (${vendor}) to ${url}`);

  // Format rawData to match what the live ERP's normalization adapter expects
  const formattedRawData = records.map((r) => {
    const v = vendor.toLowerCase();
    if (v === "zkteco" || v === "essl" || v === "fingertec") {
      // ERP's ZKTecoAdapter expects { EnrollNumber, Date, Time }
      const recordDate = new Date(r.timestamp);
      
      // Get local date and time components
      const datePart = recordDate.getFullYear() + "-" + 
        String(recordDate.getMonth() + 1).padStart(2, "0") + "-" + 
        String(recordDate.getDate()).padStart(2, "0");
        
      const timePart = String(recordDate.getHours()).padStart(2, "0") + ":" + 
        String(recordDate.getMinutes()).padStart(2, "0") + ":" + 
        String(recordDate.getSeconds()).padStart(2, "0");

      return {
        EnrollNumber: r.deviceUserId,
        Date: datePart,
        Time: timePart,
        DeviceID: r.deviceId
      };
    } else if (v === "hikvision") {
      // HikvisionAdapter expects { employeeNoString, time }
      return {
        employeeNoString: r.deviceUserId,
        time: r.timestamp,
        deviceId: r.deviceId
      };
    } else {
      // Fallback
      return r.rawData;
    }
  });

  const payload = {
    vendor,
    deviceId,
    gatewayId: config.gatewayId,
    rawData: formattedRawData
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

    const data = await response.json() as any;
    if (!data.success) {
      return {
        success: false,
        error: data.error || "Server failed to process sync job"
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    logger.error(`Error sending attendance sync batch for device ${deviceId}`, err);
    return { success: false, error: err.message || "Network request failed" };
  }
}
