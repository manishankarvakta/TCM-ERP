# Build Fix: MINIO_ENDPOINT Environment Variable Issue

## Problem
The Docker build was failing with this error:
```
Error: MINIO_ENDPOINT environment variable is required
Error: Failed to collect page data for /api/backup/[backupId]/restore
```

## Root Cause
The `lib/minio.ts` file was calling `getMinIOConfig()` at module initialization time (top-level code that runs during the build). This caused Next.js to try to access environment variables during the build phase, when they're not yet available.

## Solution
Implemented **lazy loading** for MinIO configuration:

### What Changed in `lib/minio.ts`:
1. ✅ Configuration is now loaded only when needed (at runtime)
2. ✅ Cached to avoid multiple initialization
3. ✅ S3 clients are created lazily using getters
4. ✅ All functions now call `getCachedConfig()` internally

### Technical Implementation:
- Replaced immediate configuration loading with lazy initialization
- Used Proxy pattern for S3 client to maintain API compatibility
- Cached configuration and clients for performance

## Build Status
✅ **Docker build now succeeds without errors**

## For Dokploy Deployment

### Required Environment Variables
When deploying to Dokploy, set these environment variables in your application settings:

#### Database
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=startup_mvp
```

#### MinIO (Object Storage)
```env
MINIO_ROOT_USER=your-minio-user
MINIO_ROOT_PASSWORD=your-secure-minio-password
MINIO_BUCKET_NAME=startup-mvp-files
MINIO_USE_SSL=false
MINIO_ENDPOINT=espacio-minio
MINIO_PUBLIC_URL=https://minio.yourdomain.com
MINIO_CORS_ORIGIN=https://app.yourdomain.com
```

#### Application
```env
NEXTAUTH_SECRET=your-long-random-secret-key
NEXTAUTH_URL=https://app.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
AUTH_TRUST_HOST=true
```

#### Redis (Optional)
```env
REDIS_URL=redis://espacio-redis:6379
```

#### Email (Optional)
```env
SMTP_HOST=your-smtp-host
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
EMAIL_FROM=your-email@domain.com
EMAIL_FROM_NAME=Your App Name
```

### How to Deploy in Dokploy

1. **Set Environment Variables**
   - Go to your application in Dokploy
   - Navigate to "Environment" tab
   - Add all required environment variables above

2. **Deploy Using docker-compose-new.yml**
   - The build will now succeed
   - Environment variables are injected at runtime
   - No build-time errors

3. **Verify Deployment**
   - Check container logs for successful startup
   - Verify MinIO connection works
   - Test API endpoints

## Files Modified
- ✅ `startup-mvp/lib/minio.ts` - Implemented lazy loading

## Testing
```bash
# Test build locally
docker compose -f docker-compose-new.yml build espacio-app

# Should complete without MINIO_ENDPOINT error
```

## Notes
- ✅ The fix maintains backward compatibility
- ✅ No changes needed to calling code
- ✅ Performance impact is minimal (configuration cached after first use)
- ✅ Works in both development and production environments

