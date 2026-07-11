# TS-Biomatrics Desktop Biometric Gateway

A secure, offline-first Python desktop biometric gateway application built using **PySide6**, **SQLAlchemy (SQLite)**, **httpx**, and **APScheduler**.

This gateway connects local biometric attendance hardware (ZKTeco, Hikvision, Generic readers) to the Ferrari Fashion cloud ERP.

## Features

- **Setup Wizard**: 2-step setup: (1) cloud configuration with connection test, (2) secure local admin account registration.
- **Secure Credentials**: API Keys are encrypted in SQLite using Fernet encryption bound to the local machine's unique hardware signatures. Administrator passwords are hashed using `bcrypt`.
- **Offline Caching**: Automatically saves all biometric punches locally to SQLite if the internet connection is down or the cloud ERP is unreachable.
- **Retry Backoff Queue**: Automatically schedules failed sync operations for retry using a backoff sequence:
  - Retry 1: after 1 minute
  - Retry 2: after 5 minutes
  - Retry 3: after 15 minutes
  - Retry 4: after 30 minutes
- **Background Multi-threading**: Device polling and API synchronization operations run on background threads (`QThread`) so the desktop GUI remains responsive.
- **Real-time Operations Log**: Logs application events, API responses, and device errors directly to a terminal log view within the application.

---

## Setup & Running

### Requirements
- Python 3.10+

### Development Launch
To setup a virtual environment, install dependencies, and launch the application, run:

```bash
chmod +x dev.sh
./dev.sh
```

Alternatively, configure manually:

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run main script
python app/main.py
```

---

## Verification & Testing

Since real hardware (ZKTeco MB360/Hikvision ISAPI) may not be connected:
1. **Mock Fallback**: The device adapters automatically fallback to **Mock Mode** if the connection to the configured IP fails. 
2. **Offline Mode**: Enter an invalid cloud URL in Settings (e.g. `http://invalid-ip`), click **Run Biometric Sync** on the Dashboard, verify that records are successfully cached as `PENDING` under the **Synchronization** tab.
3. **Queue Retry**: Correct the cloud URL in Settings, then go to **Synchronization** and click **Retry Failed Queue** to flush the cache.
