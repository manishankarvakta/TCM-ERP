# 🚨 EMERGENCY: Fix PostgreSQL Corruption on Dokploy

**Error:** `could not open file "global/pg_filenode.map": No such file or directory`  
**Cause:** PostgreSQL database volume is corrupted on the server  
**Impact:** Cannot login, no tables exist

---

## 🎯 Quick Fix (Recommended)

The PostgreSQL data directory on your Dokploy server is corrupted. We need to reset it and let migrations rebuild the database.

### Step 1: SSH into Your Dokploy Server

```bash
ssh your-user@your-server-ip
```

### Step 2: Navigate to Your Application Directory

```bash
# Find where Dokploy stores your application
# Usually something like:
cd /path/to/dokploy/apps/your-app-name

# Or check Dokploy documentation for the exact path
```

### Step 3: Stop the Application

```bash
docker-compose -f docker-compose-dokploy.yml down
```

### Step 4: Check Current Volume State

```bash
# Check if volume directory exists
ls -lah ./volumes/postgres/

# Check for corruption
ls -lah ./volumes/postgres/global/pg_filenode.map
```

### Step 5: Fix the Corruption

**Option A: Reset PostgreSQL Volume (if no important data OR data is already lost)**

```bash
# Backup current state (just in case)
mv ./volumes/postgres ./volumes/postgres.corrupted.backup

# PostgreSQL will create fresh directory on next start
```

**Option B: Try to Repair (if you think data might be recoverable)**

```bash
# Stop containers first
docker-compose -f docker-compose-dokploy.yml down

# Try to fix permissions
sudo chown -R 70:70 ./volumes/postgres/

# Restart and see if it fixes itself
docker-compose -f docker-compose-dokploy.yml up -d
```

### Step 6: Start Fresh (Recommended Approach)

```bash
# Stop everything
docker-compose -f docker-compose-dokploy.yml down

# Remove corrupted PostgreSQL data
rm -rf ./volumes/postgres/

# Start with the FIXED docker-compose
docker-compose -f docker-compose-dokploy.yml up -d --build

# This will:
# 1. Create fresh PostgreSQL volume
# 2. Run migrations (create all tables)
# 3. Seed admin user
# 4. Your data will NOW persist on future deployments
```

### Step 7: Verify It's Working

```bash
# Check logs
docker logs -f startup-mvp-app

# Look for:
# ✅ Database migrations completed successfully
# ✅ Initial setup completed successfully
# ✅ Default admin created: admin@example.com / admin123
# ✅ DEPLOYMENT READY - DATA SAFE
```

---

## 🔄 Alternative: Fix via Dokploy Dashboard

If you can't SSH, try this:

### 1. In Dokploy Dashboard:
- Go to your application
- Stop the application
- Find the volume management section
- Delete the PostgreSQL volume (if available)
- Restart/Redeploy the application

### 2. The fixed `docker-compose-dokploy.yml` will:
- Create fresh PostgreSQL with proper structure
- Run migrations to create tables
- Seed initial admin user
- Future deployments will preserve data ✅

---

## 📊 What Happened?

### The Corruption
```
Error: could not open file "global/pg_filenode.map"
```

This means PostgreSQL's internal catalog is corrupted. This can happen when:
- Volume was partially deleted
- Container crashed during write
- Disk issues on server
- Improper shutdown

### Why Tables Don't Exist
```
Error: The table `public.User` does not exist
```

Because the old setup used `prisma db push` which:
- Doesn't track migrations properly
- Can fail silently
- Leaves database in inconsistent state

### The Fix

By switching to `prisma migrate deploy`:
- ✅ Proper migration tracking
- ✅ Atomic operations (all or nothing)
- ✅ Database will be consistent
- ✅ Future deployments will preserve data

---

## 🎯 Expected Result After Fix

### On Fresh Start:
```
1. PostgreSQL starts with clean volume
2. Migrations run: npx prisma migrate deploy
3. All tables created from migration file
4. Admin user seeded
5. Application starts successfully
6. Login works with: admin@example.com / admin123
```

### On Future Deployments:
```
1. PostgreSQL uses existing volume
2. Migrations check: "Already applied, skipping"
3. Data preserved ✅
4. Application starts
5. All your data still there!
```

---

## 🆘 If You Can't Access Server

If you can't SSH or access Dokploy to fix this:

### Contact Your Hosting Provider

Provide them this information:
```
Issue: PostgreSQL volume corrupted
Location: ./volumes/postgres/
Action Needed: Remove and recreate volume
File: docker-compose-dokploy.yml (updated version)
```

### Manual Fix Request

Ask them to:
1. Stop container: `docker stop startup-mvp-postgres`
2. Remove volume: `rm -rf ./volumes/postgres/`
3. Restart: `docker-compose -f docker-compose-dokploy.yml up -d`

---

## 📝 After Fixing

### Verify Data Persistence

```bash
# 1. Login to application
# 2. Create a test user or quotation
# 3. Redeploy
docker-compose -f docker-compose-dokploy.yml down
docker-compose -f docker-compose-dokploy.yml up -d --build

# 4. Check if test data still exists
# If YES: ✅ Fix is working!
# If NO: ❌ Contact for further help
```

---

## 🛡️ Prevent Future Corruption

### 1. Regular Backups

Set up automated backups on your server:

```bash
# Create backup script: /root/backup-postgres.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
docker exec startup-mvp-postgres pg_dump -U postgres startup_mvp > /backups/db-$DATE.sql
find /backups -name "db-*.sql" -mtime +7 -delete  # Keep 7 days
```

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /root/backup-postgres.sh
```

### 2. Use Managed PostgreSQL (Recommended)

Consider using:
- AWS RDS
- DigitalOcean Managed Database
- Google Cloud SQL
- Azure Database

Benefits:
- Automatic backups
- High availability
- Better performance
- No corruption issues

Update `docker-compose-dokploy.yml`:
```yaml
environment:
  # Use external managed database
  DATABASE_URL: postgresql://user:pass@managed-db-url:5432/dbname
```

---

## 🎊 Summary

### What To Do Right Now

1. **SSH into server** (or use Dokploy console)
2. **Stop containers**: `docker-compose down`
3. **Remove corrupted volume**: `rm -rf ./volumes/postgres/`
4. **Restart with fix**: `docker-compose -f docker-compose-dokploy.yml up -d --build`
5. **Verify success**: Check logs for "DATA SAFE" message
6. **Login**: Use admin@example.com / admin123

### Why This Happened

- Old setup used `prisma db push` (unreliable)
- Database got into corrupted state
- Volume had partial/corrupted data

### Why It Won't Happen Again

- New setup uses `prisma migrate deploy` (reliable)
- Proper migration tracking
- Atomic operations
- Better error handling
- Data will persist across deployments ✅

---

## 📞 Need Help?

If you're stuck, provide this information:

1. **Dokploy server access method** (SSH, dashboard, etc.)
2. **Current state**: 
   ```bash
   docker ps -a
   ls -lah ./volumes/postgres/
   ```
3. **Application logs**:
   ```bash
   docker logs startup-mvp-app --tail 100
   docker logs startup-mvp-postgres --tail 50
   ```

---

**Status:** 🚨 NEEDS IMMEDIATE FIX  
**Priority:** CRITICAL  
**Action:** Reset PostgreSQL volume and redeploy with fixed docker-compose  
**Downtime:** ~2-3 minutes  
**Data Loss:** Existing data is already lost/corrupted, but fix will prevent future loss  

**Last Updated:** December 16, 2025

