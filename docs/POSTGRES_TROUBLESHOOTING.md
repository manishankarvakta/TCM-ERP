# PostgreSQL Database Issues - Troubleshooting Guide

## Error: "could not open file 'global/pg_filenode.map'"

### What This Means

This error indicates that PostgreSQL cannot access critical system files, which typically happens when:

1. **Database is still initializing** - PostgreSQL hasn't fully started yet
2. **Database volume is corrupted** - Incomplete shutdown or failed migration
3. **Version mismatch** - PostgreSQL version changed with existing data
4. **Permissions issue** - Docker volume permissions are incorrect

---

## ✅ Solution 1: Improved Wait Mechanism (APPLIED)

The deployment script now includes a robust database readiness check:

- **Waits up to 60 seconds** for PostgreSQL to be fully ready
- **Tests actual database connection** (not just process health)
- **Retries every 2 seconds** with clear status messages
- **Fails gracefully** with troubleshooting instructions

### What Changed

```yaml
# Before: Simple 10-second sleep
sleep 10;

# After: Robust connection testing
MAX_RETRIES=30;
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if echo 'SELECT 1;' | npx prisma@6.18.0 db execute --stdin; then
    # Database is ready!
    break;
  fi;
  sleep 2;  # Wait and retry
done;
```

---

## 🔧 Solution 2: Clear Corrupted Database Volume

If the error persists after the improved wait mechanism, the database volume is likely corrupted.

### For Dokploy Deployment

```bash
# SSH to your server
ssh root@your-server-ip

# Navigate to your project directory
cd /path/to/espacio  # Find this in Dokploy logs

# Stop all containers
docker-compose -f docker-compose-dokploy.yml down

# Remove corrupted PostgreSQL volume
rm -rf ./volumes/postgres

# Redeploy in Dokploy dashboard
# Database will be recreated from scratch
```

### For Local Development

```bash
# Stop containers
docker-compose down

# Remove PostgreSQL volume
rm -rf ./volumes/postgres

# Start fresh
docker-compose up -d
```

⚠️ **WARNING**: This will delete all data in the database!

---

## 🔍 Solution 3: Check Database Status

### Verify PostgreSQL is Running

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs startup-mvp-postgres

# Test PostgreSQL is ready
docker exec startup-mvp-postgres pg_isready -U postgres
```

### Test Database Connection

```bash
# Connect to PostgreSQL
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp

# Inside psql, run:
SELECT 1;
\q
```

If this works, PostgreSQL is fine and the issue is timing-related.

---

## 📊 Solution 4: Check Volume Permissions

```bash
# Check volume permissions
ls -la ./volumes/postgres

# Should be owned by user ID 999 (postgres user in container)
# If not, fix permissions:
sudo chown -R 999:999 ./volumes/postgres
```

---

## 🚨 Solution 5: PostgreSQL Version Mismatch

If you changed PostgreSQL version (e.g., from postgres:15 to postgres:16), the data format is incompatible.

### Fix

```bash
# Option A: Fresh start (data loss)
rm -rf ./volumes/postgres
# Redeploy

# Option B: Dump and restore (preserves data)
# 1. Start old version, dump data
docker run --rm -v ./volumes/postgres:/data postgres:15-alpine pg_dump -U postgres -d startup_mvp > backup.sql

# 2. Remove old data
rm -rf ./volumes/postgres

# 3. Start new version, restore data
docker-compose up -d espacio-postgres
sleep 10
cat backup.sql | docker exec -i startup-mvp-postgres psql -U postgres -d startup_mvp
```

---

## 🎯 Prevention: Best Practices

### 1. Always Use Health Checks

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### 2. Proper Dependency Management

```yaml
depends_on:
  espacio-postgres:
    condition: service_healthy  # Wait for health check to pass
```

### 3. Graceful Shutdown

```bash
# Don't force kill containers
docker-compose stop    # ✅ Graceful
docker-compose down    # ✅ Graceful
docker-compose kill    # ❌ Can corrupt database
```

### 4. Regular Backups

```bash
# Automated backup script
#!/bin/bash
docker exec startup-mvp-postgres pg_dump -U postgres startup_mvp > backup-$(date +%Y%m%d).sql
```

---

## 🔄 Recovery Workflow

### Step 1: Diagnose

```bash
# Check logs
docker logs startup-mvp-postgres

# Look for:
# - "database system is ready to accept connections" ✅ Good
# - "FATAL: could not open file" ❌ Corrupted
# - "pg_ctl: could not start server" ❌ Init failed
```

### Step 2: Try Restart

```bash
# Sometimes a simple restart works
docker-compose restart espacio-postgres

# Wait 30 seconds
sleep 30

# Try deployment again
```

### Step 3: Clear Volume (Last Resort)

```bash
# Backup first if possible
docker exec startup-mvp-postgres pg_dump -U postgres startup_mvp > backup.sql 2>/dev/null || echo "Backup failed, database inaccessible"

# Remove volume
docker-compose down
rm -rf ./volumes/postgres

# Redeploy
docker-compose up -d
```

---

## 📋 Quick Reference

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `pg_filenode.map: No such file` | Corrupted database | Clear volume |
| `database system was shut down at...` | Crash recovery | Wait longer |
| `role "postgres" does not exist` | Init not complete | Wait for healthcheck |
| `database "startup_mvp" does not exist` | First run | Normal, will be created |
| `connection refused` | PostgreSQL not started | Check container logs |

### Docker Commands

```bash
# View logs
docker logs -f startup-mvp-postgres

# Execute command in container
docker exec startup-mvp-postgres pg_isready

# Connect to database
docker exec -it startup-mvp-postgres psql -U postgres

# Inspect container
docker inspect startup-mvp-postgres

# Check volume location
docker volume inspect espacio_postgres_data
```

---

## 🆘 When Nothing Works

### Nuclear Option: Complete Reset

```bash
# 1. Stop everything
docker-compose down -v  # -v removes volumes

# 2. Remove all project data
rm -rf ./volumes/*

# 3. Clean Docker cache
docker system prune -a --volumes

# 4. Pull images fresh
docker-compose pull

# 5. Rebuild and start
docker-compose up --build -d
```

⚠️ **This deletes everything!** Only use if you have backups or it's a development environment.

---

## 📚 Related Issues

- [Data Persistence Strategy](./docs/DATA_PERSISTENCE.md)
- [Dokploy Deployment Guide](./docs/DOKPLOY_DEPLOYMENT.md)
- [MinIO Troubleshooting](./docs/MINIO_SETUP_TROUBLESHOOTING.md)

---

## ✅ After Fix: Verify

```bash
# 1. Database is running
docker ps | grep postgres
# Should show: "Up X minutes (healthy)"

# 2. Can connect
docker exec startup-mvp-postgres pg_isready
# Should show: "accepting connections"

# 3. Database exists
docker exec startup-mvp-postgres psql -U postgres -l | grep startup_mvp
# Should show your database

# 4. Migrations work
docker exec startup-mvp-app npx prisma db push
# Should show: "migrations complete"
```

---

## 🎉 Success!

Once PostgreSQL is healthy:
- ✅ Health check passes
- ✅ Prisma migrations succeed  
- ✅ Application starts normally
- ✅ Data persists across restarts

If you still have issues, check the [Dokploy Deployment Guide](./docs/DOKPLOY_DEPLOYMENT.md) or create a GitHub issue with your logs.

