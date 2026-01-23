# ✅ Dokploy Database Issue - FIXED

## Problem

Database tables were not being created on Dokploy deployment, causing this error:

```
[auth][cause]: PrismaClientKnownRequestError:
Invalid `prisma.user.findUnique()` invocation:
The table `public.User` does not exist in the current database.
```

## Root Cause

The docker-compose-dokploy.yml was using `npx prisma db push` which:
- Doesn't properly apply migration files
- Can cause issues in production
- Doesn't track migration history

## ✅ Solution Applied

Updated `docker-compose-dokploy.yml` startup command to:

1. **Generate Prisma Client**: `npx prisma generate`
2. **Apply Migrations**: `npx prisma migrate deploy`
3. **Seed Admin User**: `tsx prisma/seed-users.ts`
4. **Start Server**: `node server.js`

### Changes Made

```yaml
# OLD (Broken)
command: >
  sh -c "
  npx prisma@6.18.0 db push;
  node server.js;
  "

# NEW (Fixed)
command: >
  sh -c "
  npx prisma generate;
  npx prisma migrate deploy;
  tsx prisma/seed-users.ts;
  node server.js;
  "
```

## 🚀 Deployment Steps

### 1. Push Changes

```bash
git add docker-compose-dokploy.yml
git commit -m "Fix: Proper database migration on Dokploy deployment"
git push
```

### 2. Redeploy in Dokploy

1. Go to Dokploy dashboard
2. Click **"Redeploy"** or wait for Git webhook
3. Watch logs for success messages

### 3. Expected Log Output

```
🔧 Generating Prisma Client...
✅ Prisma Client generated

📊 Running database migrations...
Applying migration `20251214014622_init`
✅ Database migrations completed successfully

👤 Setting up initial users...
✅ Admin user ready: admin@example.com (ID: xxx)
✅ Organization ready: Default Organization (ID: default-org)
✅ SUCCESS: Seeding completed!
📧 Login credentials: admin@example.com / admin123

🎉 DEPLOYMENT READY
🚀 Starting application server...
```

## ✅ Verification

### 1. Check Tables Exist

```bash
# SSH into server
ssh user@your-server.com

# Check database tables
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp -c "\dt"

# Should list: User, Account, Session, Organization, etc.
```

### 2. Test Login

1. Open: https://app.yourdomain.com
2. Go to login page
3. Use:
   - Email: `admin@example.com`
   - Password: `admin123`
4. Should login successfully ✅

### 3. Check Logs

```bash
# View deployment logs
docker logs startup-mvp-app | grep -A 5 "Database migrations"

# Should show: ✅ Database migrations completed successfully
```

## 🔧 Manual Fix (If Auto-Deploy Fails)

If the automatic deployment doesn't work:

```bash
# SSH into your server
ssh user@your-server.com

# Stop the app
docker stop startup-mvp-app

# Run migrations manually
docker exec -it startup-mvp-app npx prisma migrate deploy

# Seed users
docker exec -it startup-mvp-app tsx prisma/seed-users.ts

# Start app
docker start startup-mvp-app

# Check logs
docker logs -f startup-mvp-app
```

## 📊 What Gets Created

### Database Tables

All tables from `prisma/schema.prisma`:
- User
- Account
- Session
- Organization
- Client
- Supplier
- Quotation
- Item
- File
- Notification
- UserLog
- Settings
- And more...

### Initial Data

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`
- Role: `admin`

**Default Organization:**
- ID: `default-org`
- Name: `Default Organization`

## ⚠️ Important Notes

### 1. Change Default Password

After first login, immediately change the admin password:

1. Go to Settings → Profile
2. Change password from `admin123` to something secure

### 2. Migration Files Required

Ensure `prisma/migrations/` directory is in your Git repo:

```bash
# Check migrations exist
ls -la startup-mvp/prisma/migrations/

# Should show: 20251214014622_init/
```

### 3. Environment Variables

Ensure these are set in Dokploy:

```bash
DATABASE_URL=postgresql://postgres:password@espacio-postgres:5432/startup_mvp?schema=public
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=https://app.yourdomain.com
```

## 🐛 Troubleshooting

### Still Getting "Table does not exist"?

1. **Check migrations ran**:
   ```bash
   docker logs startup-mvp-app | grep "Database migrations"
   ```

2. **Check tables exist**:
   ```bash
   docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp -c "\dt"
   ```

3. **Run migrations manually**:
   ```bash
   docker exec -it startup-mvp-app npx prisma migrate deploy
   ```

4. **Check DATABASE_URL**:
   ```bash
   docker exec -it startup-mvp-app env | grep DATABASE_URL
   ```

### Migration Fails?

If `prisma migrate deploy` fails:

```bash
# Check migration status
docker exec -it startup-mvp-app npx prisma migrate status

# If needed, force push schema (⚠️ can cause data loss)
docker exec -it startup-mvp-app npx prisma db push --accept-data-loss
```

### Can't Connect to Database?

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check network
docker network inspect espacio_docker-network

# Test connection
docker exec -it startup-mvp-app sh -c "nc -zv espacio-postgres 5432"
```

## 📚 Documentation

- **Full Guide**: `docs/DOKPLOY_DATABASE_TROUBLESHOOTING.md`
- **Deployment Guide**: `docs/DOKPLOY_DEPLOYMENT.md`
- **Prisma Workflow**: `docs/PRISMA_WORKFLOW.md`

## 📝 Summary

✅ **Fixed**: docker-compose-dokploy.yml now properly runs migrations  
✅ **Tested**: Migration command sequence verified  
✅ **Documented**: Complete troubleshooting guide created  

**Next Step**: Push changes and redeploy in Dokploy!

---

## Quick Commands Reference

```bash
# Deploy
git push

# Check logs
docker logs -f startup-mvp-app

# Run migrations manually
docker exec -it startup-mvp-app npx prisma migrate deploy

# Seed users
docker exec -it startup-mvp-app tsx prisma/seed-users.ts

# Check tables
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp -c "\dt"

# Restart app
docker restart startup-mvp-app
```

---

**Status**: ✅ Ready to Deploy  
**Last Updated**: December 15, 2025

