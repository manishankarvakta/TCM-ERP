/**
 * Normalization Layer for Biometric Attendance
 * Supports ZKTeco, eSSL, FingerTec
 */

export interface NormalizedPunch {
  biometricDeviceId: string;
  timestamp: Date;
  deviceId?: string;
  vendor: string;
}

export interface BiometricAdapter {
  normalize(rawData: any[]): NormalizedPunch[];
}

/**
 * ZKTeco Adapter
 * Expected format: [{ EnrollNumber: "101", Date: "2026-05-14", Time: "08:00:00", DeviceID: "1" }, ...]
 */
class ZKTecoAdapter implements BiometricAdapter {
  normalize(rawData: any[]): NormalizedPunch[] {
    return rawData.map((item) => ({
      biometricDeviceId: String(item.EnrollNumber || item.biometricDeviceId || item.employeeCode),
      timestamp: new Date(`${item.Date} ${item.Time}`),
      deviceId: item.DeviceID || item.deviceId,
      vendor: "ZKTeco",
    }));
  }
}

/**
 * eSSL Adapter
 * Expected format: [{ LogID: "1", UserID: "101", LogTime: "2026-05-14 08:00:00", DeviceIP: "192.168.1.1" }, ...]
 */
class ESSlAdapter implements BiometricAdapter {
  normalize(rawData: any[]): NormalizedPunch[] {
    return rawData.map((item) => ({
      biometricDeviceId: String(item.UserID || item.biometricDeviceId || item.employeeCode),
      timestamp: new Date(item.LogTime || item.timestamp),
      deviceId: item.DeviceIP || item.deviceId,
      vendor: "eSSL",
    }));
  }
}

/**
 * FingerTec Adapter
 * Expected format: [{ ID: "101", DateTime: "2026-05-14 08:00:00", Terminal: "Main" }, ...]
 */
class FingerTecAdapter implements BiometricAdapter {
  normalize(rawData: any[]): NormalizedPunch[] {
    return rawData.map((item) => ({
      biometricDeviceId: String(item.ID || item.biometricDeviceId || item.employeeCode),
      timestamp: new Date(item.DateTime || item.timestamp),
      deviceId: item.Terminal || item.deviceId,
      vendor: "FingerTec",
    }));
  }
}
class HikvisionAdapter implements BiometricAdapter {
  normalize(rawData: any[]): NormalizedPunch[] {
    return rawData.map((item) => ({
      biometricDeviceId: String(item.employeeNoString || item.employeeNo || item.biometricDeviceId || item.EnrollNumber),
      timestamp: new Date(item.time || item.timestamp || `${item.Date} ${item.Time}`),
      deviceId: item.deviceId,
      vendor: "Hikvision",
    }));
  }
}

export const adapters: Record<string, BiometricAdapter> = {
  ZKTeco: new ZKTecoAdapter(),
  eSSL: new ESSlAdapter(),
  FingerTec: new FingerTecAdapter(),
  Hikvision: new HikvisionAdapter(),
};

/**
 * Main normalization utility
 */
export function normalizeBiometricLogs(vendor: string, rawData: any[]): NormalizedPunch[] {
  const adapter = adapters[vendor];
  if (!adapter) {
    throw new Error(`Unsupported biometric vendor: ${vendor}`);
  }
  return adapter.normalize(rawData);
}
