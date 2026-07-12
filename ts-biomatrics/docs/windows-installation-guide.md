# TS-Biometrics Windows Installation & Deployment Guide

This guide details how to deploy, configure, and maintain the TS-Biometrics local gateway application on Windows environments.

---

## 1. Installation

1. Download **`TS-Biometrics-Setup.exe`**.
2. Double-click to launch the installer. Admin privileges are required.
3. Follow the wizard steps:
   * Select installation folder (Default is `C:\Program Files (x86)\TS-Biometrics`).
   * Select optional tasks: "Start TS-Biometrics automatically with Windows" (registers startup path for continuous polling).
4. Click **Install**.
5. Once complete, select "Launch TS-Biometrics".

---

## 2. Configuration & First Launch

On first launch, the Setup Wizard opens:
1. **Endpoint Configuration**:
   * **Cloud URL**: Enter the cloud ERP API base URL (e.g., `https://ferrarifashionbd.cloud`).
   * **API Key**: Enter the secure bearer key provided by the ERP administrator.
   * Click **Test** to run an API handshake check. Once successful, click **Next**.
2. **Admin Profile**:
   * Enter full name, administrative email, and password.
   * Click **Submit** to hash credentials locally and initialize the database.

---

## 3. Network & Firewall Requirements

The gateway communicates locally with biometric terminals and remotely with the cloud ERP. Ensure the following network paths are open:

* **Local network (LAN)**:
  * **ZKTeco port `4370` (TCP/UDP)**: Sockets must be unblocked to let the gateway poll readers.
  * **Hikvision port `80 / 443` (TCP)**: HTTP/HTTPS REST paths must be open.
* **Remote network (WAN)**:
  * **HTTPS port `443`**: Open outbound connectivity to your ERP base URL.

---

## 4. Local Files and Directories

No user data, logs, or databases are written inside the read-only installation directory (`C:\Program Files`). All local caches are written to the user's localized appdata path:

* **Windows Path**: `%LOCALAPPDATA%\TS-Biometrics\`
* **Database Cache**: `%LOCALAPPDATA%\TS-Biometrics\ts_biomatrics.db`
* **Log Files**: `%LOCALAPPDATA%\TS-Biometrics\logs\app.log`
* **Backups**: `%LOCALAPPDATA%\TS-Biometrics\backups\`
