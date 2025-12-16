# Data Persistence and Deployment Strategy

## ⚠️ CRITICAL UPDATE - December 16, 2025

**MAJOR FIX APPLIED:** We have fixed a critical data loss issue!

### What Was Fixed

❌ **OLD (DANGEROUS):** Used `npx prisma db push` in production
- Could cause data loss on schema changes
- Not safe for production deployments
- No migration tracking

✅ **NEW (SAFE):** Now uses `npx prisma migrate deploy`
- Production-safe migrations
- Never loses data
- Proper migration tracking
- All existing data preserved

### Action Required

**If you're experiencing data loss after deployments, please:**
1. Read the new `../DATA_LOSS_PREVENTION_GUIDE.md` (in project root)
2. Redeploy with the updated docker-compose files
3. Your data will be safe from now on

---

## Overview

This document explains how your application data persists across deployments and how to safely deploy updates without losing client data.

## 🔒 Data Persistence Guarantee

### ✅ What Persists Across Deployments

1. **PostgreSQL Database** - All user data, quotations, files metadata
2. **MinIO Files** - All uploaded files (images, documents, etc.)
3. **Redis Data** - Session data and cache (if configured to persist)

### 📁 Volume Mapping

Both docker-compose files use volume mounts to persist data:

```yaml
volumes:
  # PostgreSQL - All database data persists here
  - ./volumes/postgres:/var/lib/postgresql/data
  
  # MinIO - All uploaded files persist here
  - ./volumes/minio:/data
  
  # Redis - Cache and session data persists here
  - ./volumes/redis:/data
```

**These directories are on your host machine and are NOT deleted during deployments.**

---

## 🚀 Deployment Strategy

### Safe Deployment Process

When you redeploy your application:

1. **Docker pulls new image** or rebuilds from code
2. **Containers are stopped** and recreated
3. **Volumes remain untouched** - all data stays safe
4. **New container starts** and connects to existing volumes
5. **Migrations run** (if needed) - only schema changes, no data loss

### What Happens During Deployment

```bash
# 1. Stop old containers
docker-compose down  # Containers deleted, volumes stay

# 2. Rebuild/pull new images
docker-compose build

# 3. Start with existing volumes
docker-compose up -d  # Same volumes mounted = data preserved
```

---

## 🎯 Initial Setup Strategy

### Problem with Old Approach

```bash
# ❌ OLD: Runs on EVERY deployment
tsx prisma/seed-users.ts
```

**Issue:** Seeds data on every deployment, which is unnecessary and could cause issues.

### New Smart Approach

```bash
# ✅ NEW: Only seeds if database is empty
USER_COUNT=$(check user count)
if [ "$USER_COUNT" = "0" ]; then
  tsx prisma/seed-users.ts  # Only on first deploy
else
  echo "Database already initialized - skipping seed"
fi
```

**Benefits:**
- ✅ Seeds only on first deployment
- ✅ Preserves all client data on redeployments
- ✅ Safe for production with active users

---

## 🔧 Setup Page: `/setup`

### Purpose

A web interface for initial application setup instead of automatic seeding.

### How It Works

1. **First Visit** (no users exist):
   - Shows setup form
   - Create admin account
   - Create organization

2. **After Setup** (users exist):
   - Shows "Already configured" message
   - Redirects to login
   - Cannot reset without manual intervention

### Accessing Setup Page

```
https://app.espaciobd.com/setup
```

### API Endpoints

```typescript
// Check if setup is needed
GET /api/setup/check
Response: { isSetup: true/false, userCount: number }

// Perform initial setup
POST /api/setup
Body: {
  email: string,
  password: string,
  name: string,
  organizationName?: string
}
```

### Security

- Only accessible when database has zero users
- Cannot be accessed after setup is complete
- No way to reset without direct database access

---

## 📊 Data Protection During Deployment

### PostgreSQL

```yaml
espacio-postgres:
  volumes:
    # Host directory: ./volumes/postgres
    # Container path: /var/lib/postgresql/data
    - ./volumes/postgres:/var/lib/postgresql/data
```

**What's Protected:**
- ✅ All tables and data
- ✅ User accounts and passwords
- ✅ Quotations and business data
- ✅ File metadata
- ✅ Settings and configurations

**What Changes:**
- Schema updates (new columns, tables)
- Application code (logic updates)
- Dependencies (package updates)

### MinIO (File Storage)

```yaml
espacio-minio:
  volumes:
    # Host directory: ./volumes/minio
    # Container path: /data
    - ./volumes/minio:/data
```

**What's Protected:**
- ✅ All uploaded files
- ✅ User images
- ✅ Documents and PDFs
- ✅ Quotation attachments
- ✅ Bucket configurations

**Structure:**
```
volumes/minio/
├── espacio-files/          # Your bucket
│   ├── user-id-1/
│   │   ├── documents/
│   │   └── images/
│   └── user-id-2/
│       └── files/
└── .minio.sys/            # MinIO system files
```

### Redis (Cache)

```yaml
espacio-redis:
  volumes:
    - ./volumes/redis:/data
```

**What's Protected:**
- ✅ Session data (if persistence enabled)
- ✅ Cached data

**Note:** Redis is often configured as cache-only (data can be regenerated).

---

## 🛡️ Backup Strategy

### Automatic Backups

Your application includes a backup system. See `docs/BACKUP_SYSTEM.md` for details.

### Manual Backup Before Deployment

```bash
# 1. Backup PostgreSQL
docker exec startup-mvp-postgres pg_dump -U postgres startup_mvp > backup.sql

# 2. Backup MinIO files
tar -czf minio-backup.tar.gz ./volumes/minio

# 3. Backup everything
tar -czf full-backup.tar.gz ./volumes
```

### Restore if Needed

```bash
# Restore PostgreSQL
cat backup.sql | docker exec -i startup-mvp-postgres psql -U postgres startup_mvp

# Restore MinIO files
tar -xzf minio-backup.tar.gz
```

---

## 🔄 Deployment Checklist

### Before Deployment

- [ ] Backup database (optional but recommended)
- [ ] Check disk space on server
- [ ] Notify users of maintenance window (if needed)
- [ ] Test deployment in staging environment

### During Deployment

```bash
# 1. Navigate to project directory
cd /path/to/espacio

# 2. Pull latest code
git pull origin main

# 3. Deploy with docker-compose
docker-compose -f docker-compose-dokploy.yml down
docker-compose -f docker-compose-dokploy.yml up -d --build

# Or with Dokploy
# Just click "Redeploy" button
```

### After Deployment

- [ ] Check all containers are running: `docker ps`
- [ ] Check application logs: `docker logs -f startup-mvp-app`
- [ ] Test login functionality
- [ ] Test file upload
- [ ] Check database is accessible
- [ ] Monitor for errors

---

## 🚨 Common Concerns

### "Will I lose data when I redeploy?"

**No.** Volumes persist data independently of containers.

```
Container (deleted) → Volume (stays) → New Container (uses same volume)
```

### "What if I accidentally delete volumes?"

Volumes are only deleted if you explicitly run:
```bash
docker-compose down -v  # ⚠️ DON'T DO THIS IN PRODUCTION!
```

Normal redeployment:
```bash
docker-compose down      # ✅ SAFE - only removes containers
docker-compose up -d     # ✅ SAFE - reuses volumes
```

### "How do I know my data is safe?"

Check volumes exist:
```bash
# Check PostgreSQL data
ls -lh ./volumes/postgres

# Check MinIO files
ls -lh ./volumes/minio/espacio-files

# Check sizes
du -sh ./volumes/*
```

### "What about database migrations?"

Prisma migrations are **additive and safe**:
- ✅ Add new columns
- ✅ Create new tables
- ✅ Add indexes
- ❌ Never drops data automatically

Using `prisma db push` in production:
```bash
npx prisma db push  # Safe: applies schema changes without data loss
```

---

## 📈 Monitoring Data Growth

### Check Storage Usage

```bash
# Total volume size
du -sh ./volumes

# PostgreSQL size
docker exec startup-mvp-postgres \
  psql -U postgres -d startup_mvp \
  -c "SELECT pg_size_pretty(pg_database_size('startup_mvp'));"

# MinIO size
docker exec startup-mvp-minio du -sh /data

# File count
find ./volumes/minio -type f | wc -l
```

### Database Statistics

```sql
-- Connect to database
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check row counts
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## 🔐 Production Best Practices

### 1. Regular Backups

Set up automated backups (daily/weekly):

```bash
# Cron job example (runs daily at 2 AM)
0 2 * * * cd /path/to/espacio && ./backup-script.sh
```

### 2. Test Deployments in Staging

Always test new features in staging before production:

```bash
# Staging environment
docker-compose -f docker-compose-staging.yml up -d

# Test thoroughly
# Then deploy to production
```

### 3. Zero-Downtime Deployments

For production with active users:

```bash
# Use rolling updates
docker-compose up -d --no-deps --build espacio-app

# Or use load balancer for true zero-downtime
```

### 4. Monitor After Deployment

```bash
# Watch logs for 5 minutes after deployment
docker logs -f startup-mvp-app --tail 100
```

### 5. Keep Backups Off-Server

```bash
# Copy backups to remote storage
rsync -avz ./backups/ user@backup-server:/backups/espacio/
```

---

## 📋 Deployment Scenarios

### Scenario 1: Code Update Only

```bash
# Update application code
git pull
docker-compose up -d --build espacio-app

# Result:
# ✅ New code deployed
# ✅ All data preserved
# ✅ Downtime: ~30 seconds
```

### Scenario 2: Database Schema Change

```bash
# Update code with new schema
git pull
docker-compose up -d --build

# Prisma automatically:
# ✅ Detects schema changes
# ✅ Applies migrations
# ✅ Preserves existing data
# ✅ Adds new columns/tables
```

### Scenario 3: New Feature with Data Migration

```bash
# 1. Deploy new code
git pull
docker-compose up -d --build

# 2. Run data migration script (if needed)
docker exec startup-mvp-app npm run migrate:data

# Result:
# ✅ New feature available
# ✅ Data migrated/transformed
# ✅ No data loss
```

### Scenario 4: Emergency Rollback

```bash
# 1. Stop current version
docker-compose down

# 2. Checkout previous version
git checkout <previous-commit>

# 3. Deploy old version
docker-compose up -d --build

# Result:
# ✅ Old code running
# ✅ All data still intact
# ✅ May need schema rollback if DB changed
```

---

## ⚠️ What NOT to Do

### ❌ Don't Delete Volumes in Production

```bash
# NEVER run this with -v flag in production:
docker-compose down -v  # ⚠️ DELETES ALL DATA!
```

### ❌ Don't Manually Edit Volume Files

Files in `./volumes/*` are managed by Docker services. Don't manually edit them.

### ❌ Don't Skip Backups

Always have recent backups before major deployments.

### ❌ Don't Deploy Untested Changes

Test in staging first, especially schema changes.

---

## ✅ Summary

### Data Safety

| Data Type | Location | Persists? | Backup Method |
|-----------|----------|-----------|---------------|
| Database | ./volumes/postgres | ✅ Yes | pg_dump |
| Files | ./volumes/minio | ✅ Yes | tar/rsync |
| Cache | ./volumes/redis | ✅ Yes | redis-cli save |

### Deployment Safety

✅ **Safe Operations:**
- `docker-compose down` - Stops containers, keeps volumes
- `docker-compose up -d` - Starts with existing volumes
- `docker-compose restart` - Restart without data loss
- `git pull && docker-compose up -d --build` - Update code

❌ **Dangerous Operations:**
- `docker-compose down -v` - **DELETES ALL VOLUMES**
- `rm -rf ./volumes` - **DELETES ALL DATA**
- `docker volume prune` - **MAY DELETE VOLUMES**

### Key Takeaways

1. 🔒 **Volumes persist independently of containers**
2. 🔄 **Redeployments are safe by default**
3. 🎯 **Setup page only works on first deploy**
4. 💾 **Always backup before major changes**
5. ✅ **Your client data is safe during deployments**

---

## 🆘 Troubleshooting

### Volume Not Persisting

**Check volume mount:**
```bash
docker inspect startup-mvp-postgres | grep Mounts -A 10
```

**Verify host directory:**
```bash
ls -lh ./volumes/postgres
```

### Data Disappeared After Deployment

**Most likely cause:** Used `-v` flag

**Recovery:** Restore from backup

**Prevention:** Never use `docker-compose down -v` in production

### Setup Page Not Accessible

**Check user count:**
```sql
SELECT COUNT(*) FROM "User";
```

**If users exist:** Setup page will redirect to login (this is correct behavior)

---

## 📞 Support

For more information:
- [Backup System](./BACKUP_SYSTEM.md)
- [Dokploy Deployment](./DOKPLOY_DEPLOYMENT.md)
- [Database Migrations](./PRISMA_WORKFLOW.md)

---

**Last Updated:** December 15, 2025  
**Status:** ✅ Production-Ready with Data Persistence

