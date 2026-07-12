# TS-Biometrics Windows Release Checklist

Use this checklist to verify production readiness before distributing new executable and installer builds.

---

## Pre-Release Checks

- [ ] **Version Synchronization**
  - Confirmed `APP_VERSION` in `app/core/config.py` matches target version.
  - Confirmed `AppVersion` inside `installer.iss` matches target version.
  - Confirmed version metadata in `file_version_info.txt` matches target version.

- [ ] **Dependency Audit**
  - Ran `python -m pip check` to verify zero broken package requirements.
  - Confirmed `requirements.txt` and `requirements-build.txt` have pinned versions.

- [ ] **Code Validation**
  - Syntax compilation test passed: `python -m compileall app`.
  - Non-destructive smoke-test suite passed: `pytest tests/test_smoke.py`.

- [ ] **Mock-Mode Production Guard**
  - Verified `ALLOW_MOCK_MODE` is set to `False` in `app/core/config.py`.
  - Verified loopback IP/mock addresses fail connection checks in ZKTeco, Hikvision, and Generic adapters.
  - Verified mock punch records are skipped and filtered out during synchronization.

---

## Build Checks

- [ ] **PyInstaller Build (`--onedir`)**
  - Generated output structure exists: `dist/TS-Biometrics/TS-Biometrics.exe`.
  - PyInstaller build warnings log (`warn-TS-Biometrics.txt`) inspected.
  - Verified assets (`app/resources`) are fully copied into the `dist/` subfolder.

- [ ] **Inno Setup Installer**
  - Generated installer package exists: `release/TS-Biometrics-Setup.exe`.
  - Setup installer compiled using correct icon (`AppIcon.ico`).

- [ ] **Checksum Generation**
  - Portable build archived to ZIP.
  - SHA-256 Checksum values successfully written to `release/SHA256SUMS.txt`.

---

## Smoke Testing on Windows (No Python installed)

- [ ] **Launch Test**
  - App window opens and splash screen renders.
  - No black command console window appears.
  - App stylesheet themes load correctly.
  - System tray icon launches and context menu displays options.

- [ ] **Database Integrity**
  - SQLite database is created under `%LOCALAPPDATA%\TS-Biometrics\ts_biomatrics.db`.
  - Database schema initializes correctly.
  - Upgrading / reinstalling preserves existing database without data loss.

- [ ] **Offline Handling**
  - Gateway boots without internet connectivity.
  - UI remains responsive and does not freeze or crash on API errors.
  - Unreachable devices are marked as `OFFLINE` (mock mode does not mark them `ONLINE`).
