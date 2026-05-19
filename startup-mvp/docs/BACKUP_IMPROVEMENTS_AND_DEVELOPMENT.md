# Backup and Restore Improvements & Development Guide

This document outlines the recent production-level improvements made to the Backup & Restore system and provides guidelines for developers working on or debugging this system.

---

## 1. System Improvements

The backup and restore system has been hardened to ensure stability in containerized/production environments:

### Cross-Device Upload Fallback (`EXDEV` Fix)
* **The Issue**: In containerized environments, `/tmp` (where Next.js parses multipart file uploads) and `/app/backups` or `/app/uploads` (mounted persistent volumes) reside on different filesystem partitions/devices. Standard Node.js `fs.rename` fails with `EXDEV: cross-device link not permitted`.
* **The Fix**: Implemented a custom `moveFile` helper using `fs.copyFile` followed by `fs.unlink`. If `fs.rename` fails with `EXDEV`, it automatically falls back to copying the data block across devices and deleting the temp file cleanly.

### Auto-Creation of Restore Temp Directories (`ENOENT` Fix)
* **The Issue**: When the container restarts, the temporary extraction directories (like `/app/tmp/backups`) are cleared. Restoring a database or full backup without these directories caused an immediate `ENOENT` crash.
* **The Fix**: Embedded directory pre-checks and calls to `ensureBackupDirectories()` at the entry points of `restoreDatabaseBackup` and `restoreFullBackup`.

### Safe Permission Boundaries
* **The Issue**: Docker volumes mapped from Linux/Dokploy hosts default to `root:root` ownership inside the container, preventing the non-root `nextjs` process from writing new backups.
* **The Fix**: Configured `startup-mvp/docker/entrypoint.sh` to pre-create `/app/uploads`, `/app/backups`, and `/app/tmp`, changing ownership to `nextjs:nodejs` before the application starts.

### Robust `pg_restore` Error Handling
* **The Issue**: Any non-zero exit code or stderr output from `pg_restore` was swallowed, reporting fake "success" to the frontend.
* **The Fix**: Improved parsing in `executePgRestore`. Now, minor warnings (like exit code `1` or unrecognized parameters) are logged, but critical failures (exit code `>= 2`, database connection issues, file format failures) are correctly propagated and marked as `FAILED` in the UI.

---

## 2. Developer & Debugging Guidelines

### Local Development / Docker Execution

To build and run the system inside Docker:
```bash
# Build the Next.js production image and start the container stack
docker compose build ts-crm-app && docker compose up -d ts-crm-app
```

To view logs specifically related to migrations, backup permissions, or app start:
```bash
docker logs ts-crm-app
```

### Key Paths inside the Container
* **Backups storage**: `/app/backups/`
* **Uploads storage**: `/app/uploads/`
* **Temp/Extraction directory**: `/app/tmp/backups/`

---

## 3. Troubleshooting

### Permission Denied (`EACCES`)
If backup creation fails with permission errors, verify directory owners inside the container:
```bash
docker exec -it ts-crm-app ls -ld /app/backups /app/uploads
```
Output should be owned by `nextjs:nodejs`. If not, verify that `entrypoint.sh` ran as root during the container startup.

### Database Connection Failures
Ensure `pg_restore` can resolve the host name `ts-crm-postgres` on port `5432`. You can test connection availability directly from the app container:
```bash
docker exec -it ts-crm-app nc -z ts-crm-postgres 5432
```
