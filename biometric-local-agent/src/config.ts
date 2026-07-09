import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config();

export interface AgentConfig {
  liveServerBaseUrl: string;
  gatewayId: string;
  gatewayApiKey: string;

  configFetchIntervalMs: number;
  deviceSyncIntervalMs: number;
  heartbeatIntervalMs: number;
  deviceStatusIntervalMs: number;
  retryIntervalMs: number;

  autoSyncEnabled: boolean;
  eventBasedSyncEnabled: boolean;
  maxRetryCount: number;
  syncBatchSize: number;

  port: number;
  dataDir: string;
  logDir: string;

  zkTecoDefaultPort: number;
  deviceConnectTimeoutMs: number;
  localConfigFallback: boolean;
}

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined || value === "") return defaultValue;
  return value.toLowerCase() === "true";
};

export const config: AgentConfig = {
  liveServerBaseUrl: process.env.LIVE_SERVER_BASE_URL || "https://fferp.aamardokan.online",
  gatewayId: process.env.GATEWAY_ID || "main_factory_gateway_01",
  gatewayApiKey: process.env.GATEWAY_API_KEY || "change_this_secret",

  configFetchIntervalMs: getEnvNumber("CONFIG_FETCH_INTERVAL_SECONDS", 300) * 1000,
  deviceSyncIntervalMs: getEnvNumber("DEVICE_SYNC_INTERVAL_SECONDS", 60) * 1000,
  heartbeatIntervalMs: getEnvNumber("HEARTBEAT_INTERVAL_SECONDS", 60) * 1000,
  deviceStatusIntervalMs: getEnvNumber("DEVICE_STATUS_INTERVAL_SECONDS", 120) * 1000,
  retryIntervalMs: getEnvNumber("RETRY_INTERVAL_SECONDS", 300) * 1000,

  autoSyncEnabled: getEnvBoolean("AUTO_SYNC_ENABLED", true),
  eventBasedSyncEnabled: getEnvBoolean("EVENT_BASED_SYNC_ENABLED", false),
  maxRetryCount: getEnvNumber("MAX_RETRY_COUNT", 10),
  syncBatchSize: getEnvNumber("SYNC_BATCH_SIZE", 500),

  port: getEnvNumber("PORT", 5555),
  dataDir: process.env.DATA_DIR || "./data",
  logDir: process.env.LOG_DIR || "./logs",

  zkTecoDefaultPort: getEnvNumber("ZKTECO_DEFAULT_PORT", 4370),
  deviceConnectTimeoutMs: getEnvNumber("DEVICE_CONNECT_TIMEOUT_MS", 10000),
  localConfigFallback: getEnvBoolean("LOCAL_CONFIG_FALLBACK", true)
};
