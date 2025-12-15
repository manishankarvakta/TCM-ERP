# Dokploy Database Troubleshooting Guide

## Common Issue: "Table does not exist in the current database"

### Error Message
```
[auth][cause]: PrismaClientKnownRequestError:
Invalid `prisma.user.findUnique()` invocation:
The table `public.User` does not exist in the current database.
```

### Root Cause
Database migrations haven't been applied during deployment.

---

## ✅ Solution Applied

The `docker-compose-dokploy.yml` has been updated to properly run migrations:

### What Changed

**Before (Broken):**
```yaml
command: >
  sh -c "
  npx prisma@6.18.0 db push;
  node server.js;
  "
```

**After (Fixed):**
```yaml
command: >
  sh -c "
  npx prisma generate;
  npx prisma migrate deploy;
  tsx prisma/seed-users.ts;
  node server.js;
  "
```

### Why This Works

1. **`prisma generate`** - Generates Prisma Client
2. **`prisma migrate deploy`** - Applies all migrations from `prisma/migrations/`
3. **`tsx prisma/seed-users.ts`** - Creates admin user
4. **`node server.js`** - Starts the application

---

## Deployment Steps

### 1. Push Updated docker-compose-dokploy.yml

```bash
git add docker-compose-dokploy.yml
git commit -m "Fix: Add proper database migration on deployment"
git push
```

### 2. Redeploy in Dokploy

1. Go to your Dokploy dashboard
2. Navigate to your project
3. Click **"Redeploy"** or trigger via Git webhook
4. Watch the logs for migration success

### 3. Verify Deployment

Check the deployment logs for these messages:

```
🔧 Generating Prisma Client...
✅ Prisma Client generated

📊 Running database migrations...
✅ Database migrations completed successfully

👤 Setting up initial users...
✅ Admin user ready: admin@example.com
✅ Organization ready: Default Organization
✅ SUCCESS: Seeding completed!

🚀 Starting application server...
```

---

## Manual Migration (If Needed)

If automatic migration fails, you can run migrations manually:

### Method 1: Via Docker Exec

```bash
# SSH into your Dokploy server
ssh user@your-server.com

# Run migrations
docker exec -it startup-mvp-app sh -c "npx prisma migrate deploy"

# Seed users
docker exec -it startup-mvp-app sh -c "tsx prisma/seed-users.ts"

# Restart app
docker restart startup-mvp-app
```

### Method 2: Via Dokploy Console

1. Go to Dokploy dashboard
2. Open your project
3. Click on "Console" or "Shell"
4. Run:
   ```bash
   npx prisma migrate deploy
   tsx prisma/seed-users.ts
   ```

---

## Verification

### Check Database Tables

```bash
# Connect to PostgreSQL
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp

# List tables
\dt

# Should show:
# User, Account, Session, Organization, Client, etc.

# Check admin user exists
SELECT email, role FROM "User" WHERE role = 'admin';

# Should show: admin@example.com | admin

# Exit
\q
```

### Test Login

1. Open your app: https://app.yourdomain.com
2. Go to login page
3. Use credentials:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`
4. Should log in successfully ✅

---

## Common Issues

### Issue 1: Migration Files Missing

**Symptoms:**
```
Error: No migration files found
```

**Solution:**
Ensure `prisma/migrations/` directory is in your Git repo:

```bash
# Check if migrations exist
ls -la startup-mvp/prisma/migrations/

# If missing, generate migration
cd startup-mvp
npx prisma migrate dev --name init

# Commit and push
git add prisma/migrations/
git commit -m "Add initial migration"
git push
```

### Issue 2: Permission Denied

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solution:**
The Dockerfile runs as non-root user. Ensure proper permissions:

```dockerfile
# In Dockerfile (already fixed)
RUN chown -R nextjs:nodejs /app
USER nextjs
```

### Issue 3: Database Connection Failed

**Symptoms:**
```
Error: Can't reach database server
```

**Solution:**

1. **Check DATABASE_URL** in Dokploy environment:
   ```bash
   DATABASE_URL=postgresql://postgres:password@espacio-postgres:5432/startup_mvp?schema=public
   ```

2. **Verify PostgreSQL is running**:
   ```bash
   docker ps | grep postgres
   ```

3. **Check network**:
   ```bash
   docker network inspect espacio_docker-network
   # Both app and postgres should be in same network
   ```

### Issue 4: Prisma Client Not Generated

**Symptoms:**
```
Error: @prisma/client did not initialize yet
```

**Solution:**
Ensure Dockerfile includes:

```dockerfile
# Build stage
RUN npx prisma generate

# Runtime stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
```

### Issue 5: Seed Script Fails

**Symptoms:**
```
⚠️ User setup failed - users may already exist
```

**This is OK!** The seed script uses `upsert`, so it won't fail if users exist.

If you need to reset:

```bash
# Delete existing admin user
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp -c \
  "DELETE FROM \"User\" WHERE email = 'admin@example.com';"

# Run seed again
docker exec -it startup-mvp-app tsx prisma/seed-users.ts
```

---

## Database Reset (Destructive!)

⚠️ **WARNING**: This will delete ALL data!

```bash
# Stop app
docker stop startup-mvp-app

# Drop and recreate database
docker exec -it startup-mvp-postgres psql -U postgres -c \
  "DROP DATABASE IF EXISTS startup_mvp; CREATE DATABASE startup_mvp;"

# Run migrations
docker exec -it startup-mvp-app npx prisma migrate deploy

# Seed users
docker exec -it startup-mvp-app tsx prisma/seed-users.ts

# Start app
docker start startup-mvp-app
```

---

## Monitoring

### Check Migration Status

```bash
# View migration history
docker exec -it startup-mvp-app npx prisma migrate status
```

### View Application Logs

```bash
# Follow logs
docker logs -f startup-mvp-app

# Last 100 lines
docker logs --tail 100 startup-mvp-app

# Search for errors
docker logs startup-mvp-app 2>&1 | grep -i error
```

### Check Database Logs

```bash
# PostgreSQL logs
docker logs -f startup-mvp-postgres

# Check for connection issues
docker logs startup-mvp-postgres 2>&1 | grep -i "connection"
```

---

## Best Practices

### 1. Always Use Migrations

✅ **Do:**
```bash
npx prisma migrate deploy  # In production
npx prisma migrate dev     # In development
```

❌ **Don't:**
```bash
npx prisma db push  # Can cause data loss in production
```

### 2. Backup Before Migration

```bash
# Backup database before deploying
docker exec startup-mvp-postgres pg_dump -U postgres startup_mvp > backup.sql
```

### 3. Test Migrations Locally

```bash
# Test migration locally first
cd startup-mvp
npx prisma migrate dev

# Then deploy to production
git push
```

### 4. Monitor Deployment

Always watch the logs during deployment:

```bash
# In Dokploy dashboard or via SSH
docker logs -f startup-mvp-app
```

---

## Environment Variables Checklist

Ensure these are set in Dokploy:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@espacio-postgres:5432/startup_mvp?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=startup_mvp

# Auth
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://app.yourdomain.com
AUTH_TRUST_HOST=true

# App
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NODE_ENV=production
```

---

## Quick Reference

### Essential Commands

```bash
# Check if tables exist
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp -c "\dt"

# Run migrations
docker exec -it startup-mvp-app npx prisma migrate deploy

# Seed users
docker exec -it startup-mvp-app tsx prisma/seed-users.ts

# Check migration status
docker exec -it startup-mvp-app npx prisma migrate status

# View logs
docker logs -f startup-mvp-app

# Restart app
docker restart startup-mvp-app
```

### Default Credentials

After successful seeding:

- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **Change this password immediately after first login!**

---

## Related Documentation

- [Dokploy Deployment Guide](./DOKPLOY_DEPLOYMENT.md)
- [MinIO Setup](./MINIO_SETUP_TROUBLESHOOTING.md)
- [Prisma Workflow](./PRISMA_WORKFLOW.md)

---

## Support

If issues persist:

1. Check deployment logs in Dokploy dashboard
2. Verify all environment variables are set
3. Ensure PostgreSQL container is healthy
4. Check network connectivity between containers
5. Review migration files in `prisma/migrations/`

---

**Last Updated**: December 15, 2025  
**Status**: ✅ Fixed in docker-compose-dokploy.yml

