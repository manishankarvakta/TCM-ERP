import { ZKTEcoAdapter, NormalizedPunch } from "./zkteco-adapter";
import { HikvisionAdapter } from "./hikvision-adapter";

export interface DeviceConfig {
  deviceId: string;
  vendor: string;
  name: string;
  ipAddress: string;
  port?: number;
  serialNumber?: string;
  username?: string;
  password?: string;
  isActive: boolean;
  lastPulledAt?: string; // Timestamp from local devices.json cache
}

export class AdapterFactory {
  /**
   * Dispatches the connection check based on the vendor type
   */
  static async testConnection(
    device: DeviceConfig,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; error: string | null }> {
    const vendor = device.vendor.toLowerCase();
    const defaultPort = vendor === "hikvision" ? 80 : 4370;
    const port = device.port || defaultPort;

    if (vendor === "zkteco" || vendor === "essl" || vendor === "fingertec") {
      return ZKTEcoAdapter.testConnection(device.ipAddress, port, timeoutMs);
    } else if (vendor === "hikvision") {
      return HikvisionAdapter.testConnection(
        device.ipAddress,
        port,
        device.username,
        device.password
      );
    }
    
    return { success: false, error: `Unsupported device vendor: ${device.vendor}` };
  }

  /**
   * Dispatches the attendance log polling based on the vendor type
   */
  static async pullAttendance(
    device: DeviceConfig,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; punches: NormalizedPunch[]; error: string | null }> {
    const vendor = device.vendor.toLowerCase();
    const defaultPort = vendor === "hikvision" ? 80 : 4370;
    const port = device.port || defaultPort;

    if (vendor === "zkteco" || vendor === "essl" || vendor === "fingertec") {
      return ZKTEcoAdapter.pullAttendance(device.ipAddress, port, timeoutMs);
    } else if (vendor === "hikvision") {
      return HikvisionAdapter.pullAttendance(
        device.ipAddress,
        port,
        device.username,
        device.password,
        device.lastPulledAt
      );
    }

    return { success: false, punches: [], error: `Unsupported device vendor: ${device.vendor}` };
  }

  /**
   * Dispatches the user list retrieval based on the vendor type
   */
  static async pullUsers(
    device: DeviceConfig,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; userIds: string[]; error: string | null }> {
    const vendor = device.vendor.toLowerCase();
    const defaultPort = vendor === "hikvision" ? 80 : 4370;
    const port = device.port || defaultPort;

    if (vendor === "zkteco" || vendor === "essl" || vendor === "fingertec") {
      return ZKTEcoAdapter.pullUsers(device.ipAddress, port, timeoutMs);
    } else if (vendor === "hikvision") {
      return HikvisionAdapter.pullUsers(
        device.ipAddress,
        port,
        device.username,
        device.password
      );
    }

    return { success: false, userIds: [], error: `Unsupported device vendor: ${device.vendor}` };
  }
}
export { NormalizedPunch };
