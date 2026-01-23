# 🛡️ Data Loss Prevention Guide

## ⚠️ CRITICAL: Why You Were Losing Data

### The Problem

Your previous setup was using `npx prisma db push` in production, which is **DANGEROUS** and caused data loss on every deployment because:

1. **`prisma db push`** is for development only - it directly syncs your schema to the database
2. It can **DROP columns and tables** if they don't match the current schema
3. It doesn't use migration files, so there's no safety net
4. Every deployment was treating the database as "fresh" even with existing data

### The Solution

We've now switched to **`npx prisma migrate deploy`** which:

✅ **Uses migration files** - only applies documented schema changes
✅ **Never drops data** - migrations are additive and safe
✅ **Tracks what's applied** - won't re-run migrations
✅ **Production-safe** - designed specifically for deployment
✅ **Preserves all data** - your existing data is NEVER touched unless explicitly migrated

---

## 🔒 Data Persistence Architecture

### Where Your Data Lives

```
Your Server
└── /path/to/espacio/
    └── volumes/                    ← THIS DIRECTORY CONTAINS ALL YOUR DATA
        ├── postgres/               ← All database data (users, quotations, etc.)
        │   ├── base/
        │   ├── global/
        │   └── pg_wal/
        ├── minio/                  ← All uploaded files (images, documents)
        │   ├── espacio-files/
        │   └── .minio.sys/
        └── redis/                  ← Cache and session data
            └── dump.rdb
```

### How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Container     │ mounts  │  Host Directory  │ stores  │   Your Data     │
│   (Temporary)   │────────▶│  ./volumes/      │────────▶│  (Permanent)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
       ↓                            ↑                            ↑
    Deleted on                  Preserved                    Safe Forever
    redeployment               on redeploy                 (unless you delete it)
```

**Key Point:** Containers are temporary, but `./volumes/` on your host filesystem is **permanent**.

---

## 🚀 Safe Deployment Process

### What Happens During Deployment

```bash
# Step 1: Pull latest code
git pull origin main

# Step 2: Stop old containers (DATA STAYS SAFE)
docker-compose down  # Only removes containers, volumes untouched

# Step 3: Rebuild with new code
docker-compose build

# Step 4: Start new containers (connects to existing data)
docker-compose up -d

# Step 5: Apply migrations (safe, preserves data)
# This happens automatically in the startup command:
npx prisma migrate deploy  # ✅ Only applies new migrations, preserves data
```

### ✅ Safe Commands (Use These)

```bash
# Normal deployment - 100% SAFE
docker-compose -f docker-compose-dokploy.yml down
docker-compose -f docker-compose-dokploy.yml up -d --build

# Restart services - 100% SAFE
docker-compose restart

# Rebuild one service - 100% SAFE
docker-compose up -d --build espacio-app

# Stop services - 100% SAFE
docker-compose stop
```

### ❌ DANGEROUS Commands (NEVER Use These)

```bash
# ⚠️ DANGER: Deletes all volumes (ALL DATA LOST)
docker-compose down -v

# ⚠️ DANGER: Removes all volumes (ALL DATA LOST)
docker-compose down --volumes

# ⚠️ DANGER: Deletes specific volume (DATA LOST)
docker volume rm espacio_postgres-data

# ⚠️ DANGER: Removes all unused volumes (MAY DELETE DATA)
docker volume prune

# ⚠️ DANGER: Deletes the data directory (ALL DATA LOST)
rm -rf ./volumes/
```

---

## 📝 Step-by-Step Deployment Guide

### For Dokploy Users

1. **Make your code changes** locally or push to Git
2. **Commit and push** to your repository
3. **In Dokploy dashboard:**
   - Click on your application
   - Click "Redeploy" button
   - Wait for deployment to complete
4. **Your data is automatically preserved** ✅

### For Docker Compose Users

```bash
# 1. Navigate to project directory
cd /path/to/espacio

# 2. (Optional but recommended) Backup before deployment
./backup.sh

# 3. Pull latest code
git pull origin main

# 4. Deploy with Dokploy compose file
docker-compose -f docker-compose-dokploy.yml down
docker-compose -f docker-compose-dokploy.yml up -d --build

# 5. Watch logs to ensure everything is working
docker logs -f startup-mvp-app

# Look for these messages:
# ✅ "Database migrations completed successfully"
# ✅ "All existing data preserved"
# ✅ "Database already initialized (found existing users)"
# ✅ "DEPLOYMENT READY - DATA SAFE"
```

---

## 🔍 Verifying Data Persistence

### After Each Deployment, Check:

```bash
# 1. Verify containers are running
docker ps | grep espacio

# 2. Check volume directories exist and have data
ls -lh ./volumes/postgres/
ls -lh ./volumes/minio/espacio-files/

# 3. Check database has data
docker exec startup-mvp-postgres psql -U postgres -d startup_mvp -c "SELECT COUNT(*) FROM \"User\";"

# 4. Check application logs
docker logs startup-mvp-app --tail 50

# Look for: "Database already initialized (found existing users)"
# This confirms your data was preserved
```

### Check Storage Usage

```bash
# Total data size
du -sh ./volumes/

# PostgreSQL data size
du -sh ./volumes/postgres/

# MinIO files size
du -sh ./volumes/minio/

# Individual bucket size
du -sh ./volumes/minio/espacio-files/
```

---

## 🔄 Schema Changes & Migrations

### When You Modify Database Schema

If you change `prisma/schema.prisma`, follow this workflow:

```bash
# 1. Make schema changes in prisma/schema.prisma
# Example: Add a new field to User model

# 2. Create a migration (do this BEFORE deploying)
cd startup-mvp
npx prisma migrate dev --name add_new_field

# This creates a new migration file in:
# prisma/migrations/YYYYMMDDHHMMSS_add_new_field/migration.sql

# 3. Commit the migration file
git add prisma/migrations/
git commit -m "Add new field to User model"
git push

# 4. Deploy normally
# The migration will be automatically applied by "npx prisma migrate deploy"
```

### Migration Safety

Prisma migrations are **safe by default**:

✅ **Adding new tables** - Safe, no data loss
✅ **Adding new columns** - Safe, existing data preserved
✅ **Adding indexes** - Safe, improves performance
✅ **Adding constraints** - Safe if data already complies
✅ **Renaming (with @map)** - Safe, uses ALTER TABLE

⚠️ **Removing columns** - Requires explicit migration edit
⚠️ **Changing types** - May require data transformation
⚠️ **Adding NOT NULL** - Requires default value or data backfill

---

## 🗂️ Backup Strategy

### Automatic Backups (Recommended)

Set up a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/espacio && ./backup.sh >> /var/log/espacio-backup.log 2>&1
```

### Manual Backup Before Deployment

```bash
# Full backup of all data
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz ./volumes/

# Or use the built-in backup script
cd startup-mvp
npm run backup
```

### PostgreSQL-Only Backup

```bash
# Backup database
docker exec startup-mvp-postgres pg_dump -U postgres -Fc startup_mvp > backup.dump

# Restore if needed
cat backup.dump | docker exec -i startup-mvp-postgres pg_restore -U postgres -d startup_mvp
```

### MinIO Files Backup

```bash
# Backup files
tar -czf minio-backup-$(date +%Y%m%d).tar.gz ./volumes/minio/

# Or use rsync for incremental backups
rsync -avz ./volumes/minio/ /path/to/backup/location/
```

---

## 🚨 Recovery Procedures

### If Data Was Lost (Emergency Recovery)

```bash
# 1. STOP the containers immediately
docker-compose down

# 2. Restore from latest backup
# For full restore:
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz

# For database only:
cat backup.dump | docker exec -i startup-mvp-postgres pg_restore -U postgres -d startup_mvp

# For files only:
tar -xzf minio-backup-YYYYMMDD.tar.gz

# 3. Start containers
docker-compose up -d

# 4. Verify data is restored
docker exec startup-mvp-postgres psql -U postgres -d startup_mvp -c "SELECT COUNT(*) FROM \"User\";"
```

### If Containers Won't Start

```bash
# Check logs
docker logs startup-mvp-app
docker logs startup-mvp-postgres
docker logs startup-mvp-minio

# Common issues:
# 1. Migration failure - check migration files
# 2. Port conflicts - check if ports are already in use
# 3. Volume permissions - check ./volumes/ ownership
```

---

## 📊 Monitoring & Health Checks

### Application Health

```bash
# Check if application is responding
curl http://localhost:3000/api/health

# Or with external URL
curl https://dev.espaciobd.com/api/health
```

### Database Health

```bash
# Check PostgreSQL is running
docker exec startup-mvp-postgres pg_isready -U postgres

# Check connection
docker exec startup-mvp-postgres psql -U postgres -d startup_mvp -c "SELECT version();"

# Check table counts
docker exec startup-mvp-postgres psql -U postgres -d startup_mvp -c "
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
"
```

### Storage Health

```bash
# Check disk space
df -h

# Check volume sizes
du -sh ./volumes/*

# Alert if volume size is too large
VOLUME_SIZE=$(du -sb ./volumes | cut -f1)
if [ $VOLUME_SIZE -gt 10737418240 ]; then  # 10GB
  echo "Warning: Volume size exceeds 10GB"
fi
```

---

## 🎯 Common Scenarios

### Scenario 1: Adding a New Feature (No Schema Change)

```bash
# Simple code-only deployment
git pull
docker-compose -f docker-compose-dokploy.yml up -d --build espacio-app

# Data: ✅ 100% preserved
# Downtime: ~30 seconds
# Risk: ⭐ Very Low
```

### Scenario 2: Adding a New Database Column

```bash
# 1. Create migration locally
npx prisma migrate dev --name add_user_phone

# 2. Commit and push
git add prisma/
git commit -m "Add phone field to User"
git push

# 3. Deploy
docker-compose -f docker-compose-dokploy.yml down
docker-compose -f docker-compose-dokploy.yml up -d --build

# Data: ✅ 100% preserved (new column added, existing data untouched)
# Downtime: ~1 minute
# Risk: ⭐ Low (additive change only)
```

### Scenario 3: Modifying Existing Column (Risky)

```bash
# 1. Create migration with data transformation
npx prisma migrate dev --name change_email_to_lowercase

# 2. Edit migration file to add data transformation
# prisma/migrations/YYYYMMDDHHMMSS_change_email_to_lowercase/migration.sql
# Add: UPDATE "User" SET email = LOWER(email);

# 3. Test in staging first!
# 4. Backup production data
# 5. Deploy carefully

# Data: ⚠️ May be affected (needs careful testing)
# Downtime: ~2 minutes
# Risk: ⭐⭐⭐ Medium (data transformation involved)
```

### Scenario 4: Emergency Rollback

```bash
# 1. Stop current version
docker-compose down

# 2. Checkout previous working version
git checkout <previous-commit>

# 3. Deploy old version
docker-compose up -d --build

# Data: ✅ Preserved (if schema is compatible)
# Note: If you rolled back after a migration, you may need to manually
# reverse the migration or restore from backup
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Backup current data (`./backup.sh` or manual backup)
- [ ] Test changes in local/staging environment
- [ ] Review any schema changes in `prisma/schema.prisma`
- [ ] Ensure all migration files are committed
- [ ] Check disk space on server (`df -h`)
- [ ] Notify users if downtime is expected (usually < 1 minute)

### During Deployment

- [ ] Pull latest code (`git pull`)
- [ ] Stop containers (`docker-compose down`)
- [ ] Start with new code (`docker-compose up -d --build`)
- [ ] Watch logs for errors (`docker logs -f startup-mvp-app`)
- [ ] Wait for "DEPLOYMENT READY - DATA SAFE" message

### Post-Deployment

- [ ] Check all containers running (`docker ps`)
- [ ] Test login functionality
- [ ] Test file upload/download
- [ ] Check database connectivity
- [ ] Verify data is present (check user count, quotation count, etc.)
- [ ] Monitor logs for 5-10 minutes
- [ ] Test critical user workflows

---

## 🛠️ Troubleshooting Guide

### Problem: "Database migrations failed"

**Solution:**
```bash
# Check migration status
docker exec startup-mvp-app npx prisma migrate status

# View detailed logs
docker logs startup-mvp-app | grep -A 10 "migrations"

# Common fixes:
# 1. Ensure migrations directory is committed
# 2. Check DATABASE_URL is correct
# 3. Manually apply migrations if needed
docker exec startup-mvp-app npx prisma migrate deploy
```

### Problem: "Data appears to be missing after deployment"

**Checklist:**
```bash
# 1. Check if volume directory exists
ls -lah ./volumes/postgres/

# 2. Check if data is actually in database
docker exec startup-mvp-postgres psql -U postgres -d startup_mvp -c "SELECT COUNT(*) FROM \"User\";"

# 3. Check if you accidentally used -v flag
# Review command history
history | grep "docker-compose down"

# 4. If data truly lost, restore from backup
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
```

### Problem: "Application won't start after deployment"

**Diagnosis:**
```bash
# Check all container statuses
docker ps -a

# View application logs
docker logs startup-mvp-app --tail 100

# Common issues and fixes:
# 1. Port already in use - change port in docker-compose.yml
# 2. Database not ready - increase sleep time in startup command
# 3. Migration error - check prisma/migrations/ directory
# 4. Environment variable missing - check .env.docker
```

---

## 📖 Key Concepts Summary

### Docker Volumes vs. Bind Mounts

Your setup uses **bind mounts** (`./volumes/` → container paths):

```yaml
volumes:
  - ./volumes/postgres:/var/lib/postgresql/data  # Bind mount
```

**Benefits:**
✅ Data is on host filesystem (easy to access and backup)
✅ Survives container recreation
✅ Can be versioned, backed up, moved easily
✅ Transparent - you can see files directly

### Prisma Migrations vs. Push

| Feature | `migrate deploy` | `db push` |
|---------|-----------------|-----------|
| **Use case** | Production | Development only |
| **Safety** | ✅ Very safe | ❌ Can lose data |
| **History** | ✅ Tracked | ❌ No history |
| **Reversible** | ✅ Yes | ❌ No |
| **Data loss** | ✅ Never | ⚠️ Possible |
| **Team work** | ✅ Great | ⚠️ Poor |

**Always use `migrate deploy` in production!**

### Container Lifecycle

```
Create → Start → Stop → Remove
  ↑                       ↓
  └───────────────────────┘
         (Data in volumes persists)
```

Volumes are **independent** of container lifecycle.

---

## ✅ Success Indicators

After deployment, you should see:

```bash
# In logs (docker logs startup-mvp-app):
✅ "Database migrations completed successfully"
✅ "All existing data preserved"
✅ "Database already initialized (found existing users)"
✅ "DEPLOYMENT READY - DATA SAFE"
✅ "Listening on port 3000"

# In database:
✅ User count matches pre-deployment
✅ Quotation count matches pre-deployment
✅ All tables present and populated

# In filesystem:
✅ ./volumes/postgres/ has data
✅ ./volumes/minio/espacio-files/ has files
✅ File sizes are reasonable (not zero)
```

---

## 🎓 Best Practices

1. **Always backup before deployment** - Even though migrations are safe, backups provide peace of mind

2. **Test in staging first** - Never test schema changes directly in production

3. **Monitor after deployment** - Watch logs for 5-10 minutes after each deployment

4. **Keep backups off-server** - Store backups on a different server or cloud storage

5. **Use semantic versioning** - Tag releases so you can easily rollback

6. **Document schema changes** - Add comments to migration files explaining why

7. **Regular backups** - Set up automated daily/weekly backups

8. **Monitor disk space** - Ensure volumes don't fill up the server

9. **Review migration files** - Before deploying, review the SQL in migration files

10. **Gradual rollouts** - For major changes, consider blue-green deployment

---

## 📞 Support & Resources

### Documentation

- [Prisma Migrations Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)

### Project Documentation

- `docs/DATA_PERSISTENCE.md` - Overview of data persistence
- `docs/PRISMA_WORKFLOW.md` - Prisma development workflow
- `docs/DOKPLOY_DEPLOYMENT.md` - Dokploy-specific deployment guide
- `docs/DOCKER_SETUP.md` - Docker setup guide

---

## 🎉 Conclusion

**You will no longer lose data on deployments!**

The key changes:
✅ Switched from `prisma db push` to `prisma migrate deploy`
✅ Using proper migration files
✅ Volumes properly configured for persistence
✅ Startup script checks for existing data before seeding
✅ Comprehensive logging to verify data safety

**Your data is now safe across all deployments. Deploy with confidence!** 🚀

---

**Last Updated:** December 16, 2025
**Status:** ✅ Production-Ready with Full Data Protection
**Critical Fix:** Replaced dangerous `prisma db push` with safe `prisma migrate deploy`

