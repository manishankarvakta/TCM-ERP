# Dokploy MinIO Configuration - Fix Summary

## Changes Made to docker-compose-dokploy.yml

### ✅ 1. Added CORS Configuration to MinIO

**Before:**
```yaml
espacio-minio:
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
```

**After:**
```yaml
espacio-minio:
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    # CORS Configuration for browser uploads - CRITICAL
    MINIO_API_CORS_ALLOW_ORIGIN: ${MINIO_CORS_ORIGIN:-*}
```

**Why:** Without CORS, browsers block file uploads to MinIO from your app domain.

### ✅ 2. Fixed Bucket Permissions

**Before:**
```yaml
/usr/bin/mc anonymous set download myminio/${MINIO_BUCKET_NAME} || true;
```

**After:**
```yaml
/usr/bin/mc anonymous set download myminio/${MINIO_BUCKET_NAME} || true;
/usr/bin/mc anonymous set upload myminio/${MINIO_BUCKET_NAME} || true;
/usr/bin/mc anonymous set public myminio/${MINIO_BUCKET_NAME} || true;
```

**Why:** Need upload and public permissions for file uploads to work.

### ✅ 3. Added MINIO_PUBLIC_URL Documentation

Added critical comment explaining that `MINIO_PUBLIC_URL` must be set to the actual domain, not localhost.

## Critical Configuration for Production

### 🔴 MOST IMPORTANT: Set MINIO_PUBLIC_URL

In Dokploy or `.env.docker`, you **MUST** set:

```bash
# ❌ DON'T USE (will cause 403 errors):
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_PUBLIC_URL=http://espacio-minio:9000

# ✅ USE YOUR ACTUAL DOMAIN:
MINIO_PUBLIC_URL=https://minio.yourdomain.com
# OR
MINIO_PUBLIC_URL=https://yourdomain.com:9000
```

### Why This Matters

When a user uploads a file:

1. **App generates presigned URL** using `MINIO_PUBLIC_URL`
2. **Browser sends file to that URL**
3. If URL is localhost/container name → Browser can't reach it → 403 error

### Required Environment Variables

Add these in Dokploy:

```bash
# MinIO Public URL - MUST be accessible from user's browser
MINIO_PUBLIC_URL=https://minio.yourdomain.com

# MinIO Credentials
MINIO_ROOT_USER=your-access-key
MINIO_ROOT_PASSWORD=your-secret-key

# Bucket Name
MINIO_BUCKET_NAME=espacio-files

# SSL Configuration
MINIO_USE_SSL=true

# CORS - set to your app domain
MINIO_CORS_ORIGIN=https://app.yourdomain.com

# App URLs
NEXTAUTH_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

## Deployment Steps

### 1. Update Environment Variables in Dokploy

Go to your project settings and add/update:

```bash
MINIO_PUBLIC_URL=https://minio.yourdomain.com
MINIO_CORS_ORIGIN=https://app.yourdomain.com
MINIO_USE_SSL=true
```

### 2. Configure MinIO Domain

#### Option A: Using Traefik Labels

Add to `docker-compose-dokploy.yml`:

```yaml
espacio-minio:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.minio-api.rule=Host(`minio.yourdomain.com`)"
    - "traefik.http.routers.minio-api.entrypoints=websecure"
    - "traefik.http.routers.minio-api.tls.certresolver=letsencrypt"
    - "traefik.http.services.minio-api.loadbalancer.server.port=9000"
  networks:
    - docker-network
    - dokploy-network  # IMPORTANT: Add both networks
```

#### Option B: Using Reverse Proxy

Configure Nginx/Apache to proxy port 9000 to your MinIO domain.

### 3. Deploy

```bash
# In Dokploy dashboard
1. Click "Redeploy" or push to Git
2. Wait for deployment to complete
3. Check logs for errors
```

### 4. Verify Setup

```bash
# Test MinIO is accessible
curl https://minio.yourdomain.com/minio/health/live

# Should return 200 OK

# Test CORS (replace with your domain)
curl -H "Origin: https://app.yourdomain.com" \
     -H "Access-Control-Request-Method: PUT" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://minio.yourdomain.com/espacio-files/test.txt
     
# Should include Access-Control-Allow-Origin header
```

### 5. Test File Upload

1. Open https://app.yourdomain.com
2. Navigate to file upload page
3. Upload a file
4. Check browser console - should NOT see 403 errors

## Comparison: Local vs Production

| Configuration | Local Development | Production (Dokploy) |
|--------------|-------------------|---------------------|
| **MINIO_ENDPOINT** | localhost | espacio-minio |
| **MINIO_PUBLIC_URL** | http://localhost:9000 | https://minio.yourdomain.com |
| **MINIO_USE_SSL** | false | true |
| **MINIO_CORS_ORIGIN** | * | https://app.yourdomain.com |
| **Credentials** | minioadmin:minioadmin | Strong generated passwords |
| **Bucket Policy** | Public | Public or Presigned URLs only |
| **Network** | Host + Docker | Docker + Dokploy network |

## Troubleshooting

### Still Getting 403 Errors?

#### Check 1: MINIO_PUBLIC_URL
```bash
# SSH into your server
docker exec startup-mvp-app env | grep MINIO_PUBLIC_URL

# Should show: https://minio.yourdomain.com
# NOT: http://localhost:9000 or http://espacio-minio:9000
```

#### Check 2: MinIO Accessible from Browser
```bash
# From your local machine (not server):
curl https://minio.yourdomain.com/minio/health/live

# Should return: 200 OK
# If connection refused: MinIO not exposed to internet
```

#### Check 3: CORS Configured
```bash
docker inspect startup-mvp-minio | grep CORS

# Should show: MINIO_API_CORS_ALLOW_ORIGIN
```

#### Check 4: Credentials Match
```bash
# Check app credentials
docker exec startup-mvp-app env | grep MINIO_ACCESS_KEY
docker exec startup-mvp-app env | grep MINIO_SECRET_KEY

# Check MinIO credentials
docker inspect startup-mvp-minio | grep MINIO_ROOT_USER
docker inspect startup-mvp-minio | grep MINIO_ROOT_PASSWORD

# Must match!
```

### MinIO Not Accessible from Internet

**Problem:** Can't reach https://minio.yourdomain.com

**Solutions:**

1. **Add Traefik labels** (see Option A above)
2. **Check DNS:** `dig minio.yourdomain.com` should point to your server
3. **Check firewall:** Ensure port 9000 is open
4. **Check Dokploy network:** MinIO must be in `dokploy-network`

```yaml
espacio-minio:
  networks:
    - docker-network
    - dokploy-network  # Add this!
```

### SSL Certificate Issues

**Problem:** SSL certificate errors

**Solutions:**

1. **Use Traefik with Let's Encrypt:**
   ```yaml
   labels:
     - "traefik.http.routers.minio-api.tls.certresolver=letsencrypt"
   ```

2. **Or use Certbot:**
   ```bash
   certbot certonly --standalone -d minio.yourdomain.com
   ```

## Security Recommendations

### 1. Use Strong Credentials

```bash
# Generate strong passwords
openssl rand -base64 32 > minio-secret.txt
```

Set in Dokploy:
```bash
MINIO_ROOT_USER=admin-$(openssl rand -hex 8)
MINIO_ROOT_PASSWORD=$(cat minio-secret.txt)
```

### 2. Restrict CORS

```bash
# Don't use * in production
MINIO_CORS_ORIGIN=https://app.yourdomain.com
```

### 3. Consider Private Bucket

For maximum security, use private bucket with presigned URLs only:

```yaml
# Remove from minio-setup:
# /usr/bin/mc anonymous set public myminio/${MINIO_BUCKET_NAME}

# Files only accessible via presigned URLs from your app
```

### 4. Enable Rate Limiting

Use Traefik or Nginx to rate limit MinIO:

```yaml
# Traefik
labels:
  - "traefik.http.middlewares.minio-ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.minio-ratelimit.ratelimit.burst=50"
```

## Monitoring

### Check Upload Statistics

```sql
-- Connect to PostgreSQL
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp

-- Query upload statistics
SELECT 
  COUNT(*) as total_files,
  SUM(size) / 1024 / 1024 / 1024 as total_size_gb,
  COUNT(DISTINCT "ownerId") as unique_users,
  DATE(MAX("createdAt")) as last_upload
FROM "File"
WHERE "isFolder" = false;
```

### Monitor MinIO Storage

```bash
# Check disk usage
docker exec startup-mvp-minio du -sh /data

# Check bucket size
docker exec startup-mvp-minio mc du myminio/espacio-files
```

### View Recent Uploads

```bash
# Last 10 uploaded files
docker exec startup-mvp-minio mc ls --recursive myminio/espacio-files | tail -10
```

## Quick Reference

### Essential Dokploy Environment Variables

```bash
# Must be set correctly for file uploads to work:
MINIO_PUBLIC_URL=https://minio.yourdomain.com
MINIO_CORS_ORIGIN=https://app.yourdomain.com
MINIO_USE_SSL=true
MINIO_ROOT_USER=<your-access-key>
MINIO_ROOT_PASSWORD=<your-secret-key>
NEXTAUTH_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

### Verification Commands

```bash
# Check MinIO health
curl https://minio.yourdomain.com/minio/health/live

# Check app environment
docker exec startup-mvp-app env | grep MINIO

# Check MinIO container
docker inspect startup-mvp-minio | grep -E "MINIO|CORS"

# View logs
docker logs -f startup-mvp-minio
docker logs -f startup-mvp-app
```

### Access MinIO Console

```
URL: https://minio-console.yourdomain.com
Or: https://minio.yourdomain.com (will redirect to console)
Login: Your MINIO_ROOT_USER and MINIO_ROOT_PASSWORD
```

## Files Modified

- ✅ `docker-compose-dokploy.yml` - Added CORS, fixed bucket setup
- ✅ `docs/DOKPLOY_DEPLOYMENT.md` - Complete deployment guide
- ✅ `DOKPLOY_MINIO_FIX_SUMMARY.md` - This file

## Next Steps

1. ✅ Update environment variables in Dokploy
2. ✅ Configure MinIO domain (Traefik or reverse proxy)
3. ✅ Redeploy application
4. ✅ Verify MinIO is accessible from browser
5. ✅ Test file upload
6. ✅ Monitor logs for any errors

## Related Documentation

- [Dokploy Deployment Guide](docs/DOKPLOY_DEPLOYMENT.md) - Complete guide
- [File Manager System](docs/FILE_MANAGER_SYSTEM.md) - File system overview
- [MinIO Setup & Troubleshooting](docs/MINIO_SETUP_TROUBLESHOOTING.md) - Detailed troubleshooting
- [Local Development Fix](MINIO_FIX_SUMMARY.md) - For local development

## Support

If issues persist after following this guide:

1. Check browser console for detailed error messages
2. Check server logs: `docker logs -f startup-mvp-app`
3. Check MinIO logs: `docker logs -f startup-mvp-minio`
4. Verify environment variables are correctly set
5. Test MinIO accessibility from your local machine

---

**Remember:** The #1 cause of file upload failures in production is incorrect `MINIO_PUBLIC_URL`. Make sure it's set to your actual domain, not localhost! 🚀

