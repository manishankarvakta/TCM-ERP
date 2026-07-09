import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { config } from "./config";
import { logger, logEmitter } from "./logger";
import { checkSystemRequirements } from "./bootstrap/check-system";
import { ensureFoldersExist } from "./bootstrap/ensure-folders";
import { ConfigWorker } from "./workers/config-worker";
import { SyncWorker } from "./workers/sync-worker";
import { HeartbeatWorker } from "./workers/heartbeat-worker";
import { StatusWorker } from "./workers/status-worker";
import { RetryWorker } from "./workers/retry-worker";
import { AttendanceStore } from "./storage/attendance-store";
import { UserWorker } from "./workers/user-worker";

async function bootstrap() {
  logger.info("====================================================");
  logger.info(`Starting Biometric Local Agent (Gateway: ${config.gatewayId})`);
  logger.info("====================================================");

  // 1. Run system checks
  if (!checkSystemRequirements()) {
    logger.error("System check failed! Exiting agent.");
    process.exit(1);
  }

  // 2. Ensure data/log folders exist
  ensureFoldersExist(config.dataDir, config.logDir);

  logger.info("System successfully initialized.");

  // 3. Initial setup run
  // First run device config sync to populate devices list
  try {
    await ConfigWorker.run();
  } catch (err) {
    logger.error("Initial config sync failed", err);
  }

  // 4. Initial runs of workers
  logger.info("Running initial sync tasks...");
  try {
    await Promise.all([
      SyncWorker.run(),
      HeartbeatWorker.run(),
      StatusWorker.run(),
      RetryWorker.run(),
      UserWorker.run()
    ]);
  } catch (err) {
    logger.error("Error during initial worker run sequence", err);
  }

  // 5. Register scheduled intervals
  logger.info(`Configuring worker loops:`);
  logger.info(`- Config Fetch: every ${config.configFetchIntervalMs / 1000}s`);
  logger.info(`- Device Polling Sync: every ${config.deviceSyncIntervalMs / 1000}s`);
  logger.info(`- Gateway Heartbeat: every ${config.heartbeatIntervalMs / 1000}s`);
  logger.info(`- Device Health Status: every ${config.deviceStatusIntervalMs / 1000}s`);
  logger.info(`- Retry Queue Upload: every ${config.retryIntervalMs / 1000}s`);

  // Config & User Mappings Verification worker
  setInterval(async () => {
    try {
      await ConfigWorker.run();
      await UserWorker.run();
    } catch (e) {
      logger.error("Error in ConfigWorker/UserWorker interval task", e);
    }
  }, config.configFetchIntervalMs);

  // Sync worker
  setInterval(async () => {
    try {
      await SyncWorker.run();
    } catch (e) {
      logger.error("Error in SyncWorker interval task", e);
    }
  }, config.deviceSyncIntervalMs);

  // Heartbeat worker
  setInterval(async () => {
    try {
      await HeartbeatWorker.run();
    } catch (e) {
      logger.error("Error in HeartbeatWorker interval task", e);
    }
  }, config.heartbeatIntervalMs);

  // Device status worker
  setInterval(async () => {
    try {
      await StatusWorker.run();
    } catch (e) {
      logger.error("Error in StatusWorker interval task", e);
    }
  }, config.deviceStatusIntervalMs);

  // Retry worker
  setInterval(async () => {
    try {
      await RetryWorker.run();
    } catch (e) {
      logger.error("Error in RetryWorker interval task", e);
    }
  }, config.retryIntervalMs);

  // 6. Start lightweight HTTP server for health checking and activities dashboard
  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    if (url === "/activities") {
      // Serve the HTML activities console dashboard
      try {
        const htmlPath = path.resolve(process.cwd(), "src/dashboard.html");
        const htmlContent = fs.readFileSync(htmlPath, "utf8");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(htmlContent);
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to load activities dashboard", details: err.message }));
      }
    } else if (url === "/events") {
      // Setup Server-Sent Events (SSE) stream for real-time console logs
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      // Stream connection signal
      res.write(`data: ${JSON.stringify({ level: "INFO", message: "Live dashboard connected to log stream", timestamp: new Date().toISOString() })}\n\n`);

      const onLog = (logData: any) => {
        try {
          res.write(`data: ${JSON.stringify(logData)}\n\n`);
        } catch (e) {}
      };

      logEmitter.on("log", onLog);

      req.on("close", () => {
        logEmitter.off("log", onLog);
      });
    } else if (url === "/status" || url === "/" || url === "/health") {
      try {
        const metrics = AttendanceStore.getStatusSummary(config.maxRetryCount);
        const devices = ConfigWorker.getLocalDevices();
        
        const steps: any[] = [];
        try {
          const taskPath = path.resolve(process.cwd(), "task.md");
          if (fs.existsSync(taskPath)) {
            const content = fs.readFileSync(taskPath, "utf8");
            const lines = content.split("\n");
            for (const line of lines) {
              const stepMatch = line.match(/^\s*-\s*`\[([ x/])\]`\s*(Step\s*\d+:.*)$/i);
              if (stepMatch) {
                steps.push({
                  completed: stepMatch[1] === "x",
                  inProgress: stepMatch[1] === "/",
                  title: stepMatch[2].trim(),
                  items: []
                });
              } else {
                const subMatch = line.match(/^\s*-\s*`\[([ x/])\]`\s*(.*)$/i);
                if (subMatch && steps.length > 0) {
                  steps[steps.length - 1].items.push({
                    completed: subMatch[1] === "x",
                    inProgress: subMatch[1] === "/",
                    title: subMatch[2].trim()
                  });
                }
              }
            }
          }
        } catch (e) {}

        const statusReport = {
          gatewayId: config.gatewayId,
          status: "ONLINE",
          currentTime: new Date().toISOString(),
          version: "1.0.0",
          metrics: {
            pendingLogs: metrics.pending,
            failedLogs: metrics.failed,
            totalCachedLogs: AttendanceStore.getCache().records.length
          },
          devices: devices.map(d => {
            const statusInfo = StatusWorker.getDeviceStatus(d.deviceId);
            return {
              deviceId: d.deviceId,
              name: d.name,
              vendor: d.vendor,
              ipAddress: d.ipAddress,
              port: d.port,
              lastPulledAt: d.lastPulledAt || null,
              isActive: d.isActive,
              isReachable: statusInfo ? statusInfo.reachable : false,
              lastCheckedAt: statusInfo ? statusInfo.lastCheckedAt : null,
              lastError: statusInfo ? statusInfo.lastError : null
            };
          }),
          steps
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(statusReport, null, 2));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to generate status report", details: err.message }));
      }
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(config.port, () => {
    logger.info(`Status HTTP Server running at http://localhost:${config.port}/`);
    logger.info(`Activities Console Dashboard available at http://localhost:${config.port}/activities`);
    logger.info("Agent is running and listening for schedules. Press Ctrl+C to terminate.");
  });
}

// Global exception handling
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception in agent process", err);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Promise rejection at: ${promise}`, reason);
});

bootstrap();
