# ffERP Biometric Local Agent

The `biometric-local-agent` is a lightweight Node.js/TypeScript application designed to run on a local server or PC (e.g., inside an office or factory network). It periodically polls local biometric attendance devices (such as ZKTeco and Hikvision) via their local IPs, stores records locally in a JSON-based database cache to prevent data loss during internet outages, and synchronizes them with the live ERP server.

## Features

- **Multi-vendor Support**: Handles ZKTeco TCP/IP protocol (via `node-zklib`) and Hikvision (via HTTP ISAPI events).
- **HTTP Digest Authentication**: Native implementation of Digest authentication to communicate securely with Hikvision cameras/terminals.
- **Offline Resiliency**: Leverages local atomic JSON files (`data/attendance-cache.json`) to store punches. Data is never deleted until it is successfully synced to the live ERP.
- **Batch Uploads**: Synchronizes punches in chunks to minimize API latency and overhead.
- **Auto-Retry Worker**: Periodically retries uploading failed punches with a configurable max retry limit.
- **Gateway Heartbeat**: Reports local gateway parameters (number of pending, synced, and failed logs) to the live ERP.
- **Device Health Monitor**: Periodically checks connection reachability for all devices and reports back to the ERP.
- **Fallback Configurations**: Loads device layouts from live server, with local config backup (`gateway.config.json`) if the server is offline.

---

## Installation & Setup

### Prerequisites
- Node.js version **20.x** or higher.
- npm (Node Package Manager).

### Quick Start (Linux / macOS)
1. Navigate to the agent directory:
   ```bash
   cd biometric-local-agent
   ```
2. Run the bootstrap and launch script:
   ```bash
   ./install-and-run.sh
   ```

### Quick Start (Windows)
Double-click `start.bat` or run it from a Command Prompt:
```cmd
start.bat
```

---

## Environment Variables (`.env`)

Configure the connection to your live ERP server and modify worker behaviors in the `.env` file:

```env
# Live ERP
LIVE_SERVER_BASE_URL=https://fferp.aamardokan.online
GATEWAY_ID=main_factory_gateway_01
GATEWAY_API_KEY=d67926ccee211f69563a13f23f92374360f39729e06896d4526a7ac7b46c5dfa

# Intervals in seconds
CONFIG_FETCH_INTERVAL_SECONDS=300
DEVICE_SYNC_INTERVAL_SECONDS=60
HEARTBEAT_INTERVAL_SECONDS=60
DEVICE_STATUS_INTERVAL_SECONDS=120
RETRY_INTERVAL_SECONDS=300

# Sync options
AUTO_SYNC_ENABLED=true
EVENT_BASED_SYNC_ENABLED=false
MAX_RETRY_COUNT=10
SYNC_BATCH_SIZE=500

# Local files
DATA_DIR=./data
LOG_DIR=./logs

# Device defaults
ZKTECO_DEFAULT_PORT=4370
DEVICE_CONNECT_TIMEOUT_MS=10000

# Optional local mode
LOCAL_CONFIG_FALLBACK=true
```

---

## Local JSON Database Structure

Files are saved inside the configured `data/` folder:
- **`devices.json`**: Current synced/loaded list of devices from the ERP.
- **`attendance-cache.json`**: List of all downloaded punches, containing their `syncStatus` (`PENDING`, `SYNCED`, `FAILED`), deduplication checksum hashes, retry counters, and raw vendor payloads.

---

## Status Check Server

When the agent runs, it starts a lightweight HTTP server on the configured port (defaulting to **`5555`**). You can query the agent status or run a health check by visiting:
`http://localhost:5555/` or `http://localhost:5555/status`

This returns a JSON report indicating:
- Agent status (`ONLINE`)
- Current server time
- Logs status summary (`pendingLogs`, `failedLogs`, and total count)
- Connected devices with details and their `lastPulledAt` times

---

## Logging

Logs are output to the terminal console and concurrently written to `logs/app.log`.
You can trace this file to check connection issues, failed API syncs, or device configuration status.
