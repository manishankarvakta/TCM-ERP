# TS-Biometrics Windows Build Guide

This document describes how to compile the TS-Biometrics application into a standalone executable and setup installer on Windows.

---

## 1. System Requirements

* **Operating System**: Windows 10 or 11 (64-bit recommended)
* **Python**: Python 3.13 (or compatible 64-bit release)
* **Inno Setup**: Inno Setup 6 (required to build the setup installer)

---

## 2. Setting Up the Build Environment

Open a PowerShell terminal inside the project directory and follow these steps:

1. **Create and Activate Virtual Environment**:
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```
2. **Install Compilation Dependencies**:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   pip install -r requirements-build.txt
   ```

---

## 3. Running Compilation and Packing

Run the automated build script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-windows.ps1
```

The script will automatically:
1. Validate package dependencies.
2. Compile python source syntax (`compileall`).
3. Run the non-destructive smoke-test suite (`pytest`).
4. Trigger PyInstaller using [TS-Biomatrics.spec](file:///Users/manishankarvakta/Desktop/APPS/ffERP/ts-biomatrics/TS-Biomatrics.spec) to package the app in `--onedir` mode.
5. Derive file version metadata using [file_version_info.txt](file:///Users/manishankarvakta/Desktop/APPS/ffERP/ts-biomatrics/file_version_info.txt).
6. Invoke Inno Setup compiler (`iscc`) to bundle everything into a Windows setup installer.
7. Output ZIP binaries, setup installers, and SHA-256 checksum logs into the `release/` directory.

---

## 4. Troubleshooting Build Errors

### Qt Platform Plugin Errors
If the built executable fails to launch with a Qt plugin warning:
* Verify the PySide6 package is properly installed inside your venv.
* Clear PyInstaller build cache folders and re-run:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\clean-windows-build.ps1
  powershell -ExecutionPolicy Bypass -File scripts\build-windows.ps1
  ```

### Antivirus False Positives
Single-file pyinstaller compilations can trigger false antivirus flags. 
* By default, we compile in `--onedir` mode, which has extremely low antivirus warning triggers compared to `--onefile` mode.
* If flagging occurs, sign the generated executable or whitelist the directory.
