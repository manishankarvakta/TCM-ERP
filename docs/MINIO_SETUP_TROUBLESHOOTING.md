# MinIO Setup and Troubleshooting Guide

## Overview

This guide covers the setup, configuration, and troubleshooting of MinIO object storage for file uploads in the Espacio application.

## Architecture

### Docker Network Setup

MinIO runs inside a Docker network (`espacio_app-network`) alongside PostgreSQL and Redis. The Next.js development server runs on the host machine and connects to MinIO via `localhost:9000`.

```
┌─────────────────────────────────────────────────────┐
│                    Host Machine                      │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  Next.js Dev Server (localhost:3000)       │    │
│  │  - Generates presigned URLs                │    │
│  │  - Uses MINIO_PUBLIC_URL for browser       │    │
│  └────────────────────────────────────────────┘    │
│                       │                              │
│                       ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │        Docker Network (espacio_app-network) │    │
│  │                                             │    │
│  │  ┌──────────────┐  ┌──────────────┐       │    │
│  │  │   MinIO      │  │  PostgreSQL  │       │    │
│  │  │  :9000       │  │   :5432      │       │    │
│  │  └──────────────┘  └──────────────┘       │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Configuration

### 1. Environment Variables (.env)

**Critical**: All MinIO credentials must match between `.env` and `docker-compose.yml`.

```bash
# MinIO Configuration
MINIO_ENDPOINT=localhost              # For dev: localhost, For Docker: container name
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin          # Must match docker-compose
MINIO_SECRET_KEY=minioadmin          # Must match docker-compose
MINIO_BUCKET_NAME=espacio-files
MINIO_PUBLIC_URL=http://localhost:9000  # URL accessible from browser

# Legacy Docker Compose variables
MINIO_ROOT_USER=minioadmin           # Must match MINIO_ACCESS_KEY
MINIO_ROOT_PASSWORD=minioadmin       # Must match MINIO_SECRET_KEY
```

### 2. Docker Compose Configuration

```yaml
espacio-minio:
  image: minio/minio:latest
  container_name: startup-mvp-minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    # CRITICAL: Enable CORS for browser uploads
    MINIO_API_CORS_ALLOW_ORIGIN: "*"
  ports:
    - "${MINIO_PORT:-9000}:9000"      # API port
    - "${MINIO_CONSOLE_PORT:-9001}:9001"  # Web console
  volumes:
    - ./volumes/minio:/data
  networks:
    - app-network
```

### 3. Bucket Setup

The `espacio-minio-setup` service automatically:
1. Creates the bucket
2. Sets public access policy
3. Runs on container startup

```yaml
espacio-minio-setup:
  image: minio/mc:latest
  depends_on:
    espacio-minio:
      condition: service_healthy
  entrypoint: >
    /bin/sh -c "
    sleep 5;
    /usr/bin/mc alias set myminio http://espacio-minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin};
    /usr/bin/mc mb myminio/${MINIO_BUCKET_NAME:-startup-mvp-files} || true;
    /usr/bin/mc anonymous set public myminio/${MINIO_BUCKET_NAME:-startup-mvp-files} || true;
    exit 0;
    "
```

## Common Issues and Solutions

### Issue 1: Upload Failed with Status 403

**Symptoms:**
```
Uncaught (in promise) Error: Upload failed with status 403
    at UploadDialog.useCallback[uploadFile] (UploadDialog.tsx:282:17)
```

**Root Causes:**

#### A. Credential Mismatch
The most common cause. Credentials in `.env` don't match Docker container.

**Diagnosis:**
```bash
# Check .env credentials
grep "MINIO_" startup-mvp/.env

# Check Docker container credentials
docker inspect startup-mvp-minio | grep -A 5 "Env"
```

**Solution:**
1. Ensure credentials match:
   ```bash
   # In .env file
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=minioadmin
   ```

2. Restart dev server:
   ```bash
   # Stop current dev server (Ctrl+C)
   cd startup-mvp
   npm run dev
   ```

#### B. CORS Not Configured

**Diagnosis:**
```bash
# Check if CORS is enabled
docker inspect startup-mvp-minio | grep CORS
```

**Solution:**
1. Add CORS environment variable to docker-compose.yml:
   ```yaml
   environment:
     MINIO_API_CORS_ALLOW_ORIGIN: "*"
   ```

2. Restart MinIO:
   ```bash
   docker-compose restart espacio-minio
   ```

#### C. Bucket Doesn't Exist

**Diagnosis:**
```bash
docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
  mc ls myminio/
"
```

**Solution:**
```bash
# Run setup container
docker-compose up espacio-minio-setup

# Or create manually
docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
  mc mb myminio/espacio-files &&
  mc anonymous set public myminio/espacio-files
"
```

### Issue 2: MinIO Container Not Starting

**Symptoms:**
- Container exits immediately
- Health check fails

**Diagnosis:**
```bash
docker logs startup-mvp-minio
docker ps -a | grep minio
```

**Common Causes:**
1. Port 9000 or 9001 already in use
2. Volume permission issues
3. Invalid credentials format

**Solutions:**

**Port Conflict:**
```bash
# Check what's using the port
lsof -i :9000
lsof -i :9001

# Kill the process or change ports in docker-compose.yml
```

**Volume Permissions:**
```bash
# Fix permissions
sudo chown -R $(whoami) ./volumes/minio
chmod -R 755 ./volumes/minio
```

### Issue 3: Presigned URL Signature Mismatch

**Symptoms:**
- 403 error with "signature does not match"
- Upload works in MinIO console but not from app

**Diagnosis:**
```bash
# Test presigned URL generation
node test-minio-presigned.js
```

**Solution:**
This is always a credential mismatch. The presigned URL is signed with credentials that don't match the MinIO server.

1. Stop dev server
2. Update `.env` with correct credentials
3. Restart dev server
4. Clear browser cache

### Issue 4: Network Connection Issues

**Symptoms:**
- "Connection refused" errors
- "ECONNREFUSED localhost:9000"

**Diagnosis:**
```bash
# Check if MinIO is running
docker ps | grep minio

# Check if port is accessible
curl http://localhost:9000/minio/health/live

# Check Docker network
docker network inspect espacio_app-network
```

**Solutions:**

**MinIO Not Running:**
```bash
docker-compose up -d espacio-minio
```

**Network Issues:**
```bash
# Recreate network
docker-compose down
docker-compose up -d
```

**Firewall:**
```bash
# macOS
sudo pfctl -d  # Disable firewall temporarily for testing

# Linux
sudo ufw allow 9000
sudo ufw allow 9001
```

## Verification Steps

### 1. Verify MinIO is Running

```bash
# Check container status
docker ps | grep minio

# Check health
curl http://localhost:9000/minio/health/live

# Should return: empty response with 200 status
```

### 2. Verify Bucket Exists

```bash
docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
  mc ls myminio/ &&
  mc anonymous get myminio/espacio-files
"
```

Expected output:
```
[2025-12-15 09:06:50 UTC]     0B espacio-files/
Access permission for `myminio/espacio-files` is `public`
```

### 3. Test Upload Manually

```bash
# Create test file
echo "test content" > test.txt

# Upload using mc
docker run --rm --network espacio_app-network \
  -v $(pwd)/test.txt:/test.txt \
  --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
  mc cp /test.txt myminio/espacio-files/test.txt &&
  mc ls myminio/espacio-files/
"

# Cleanup
rm test.txt
```

### 4. Test Presigned URL Generation

```bash
cd startup-mvp
node << 'EOF'
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

async function test() {
  const s3 = new S3Client({
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    credentials: {
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: "espacio-files",
    Key: "test/file.txt",
    ContentType: "text/plain",
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  console.log("✓ Presigned URL generated successfully");
  console.log(url);
}

test().catch(err => {
  console.error("✗ Failed:", err.message);
  process.exit(1);
});
EOF
```

### 5. Test from Browser

1. Open browser console on your app (F12)
2. Try uploading a file
3. Check Network tab for the PUT request to MinIO
4. Look for:
   - Request URL should be `http://localhost:9000/espacio-files/...`
   - Status should be 200
   - Response should include ETag header

## Best Practices

### Development Environment

1. **Use default credentials** (`minioadmin:minioadmin`) for local development
2. **Keep credentials in sync** between `.env` and `docker-compose.yml`
3. **Enable CORS** with `MINIO_API_CORS_ALLOW_ORIGIN: "*"`
4. **Use public bucket policy** for easier development

### Production Environment

1. **Use strong credentials** (generate with `openssl rand -base64 32`)
2. **Enable SSL** (`MINIO_USE_SSL=true`)
3. **Restrict CORS** to your domain only
4. **Use private buckets** with presigned URLs
5. **Set up bucket lifecycle policies** for automatic cleanup
6. **Enable versioning** for important files
7. **Configure backup** to S3 or another MinIO instance

### Security

1. **Never commit credentials** to git
2. **Rotate credentials** regularly in production
3. **Use environment-specific** `.env` files
4. **Audit access logs** regularly
5. **Set appropriate expiration** times for presigned URLs (default: 1 hour)

## Monitoring

### Check MinIO Console

Access at: http://localhost:9001

Default credentials: `minioadmin:minioadmin`

Features:
- View buckets and files
- Monitor storage usage
- Check access logs
- Configure bucket policies
- Manage users and access keys

### Check Application Logs

```bash
# Dev server logs
cd startup-mvp
npm run dev

# Docker logs
docker logs startup-mvp-minio
docker logs startup-mvp-postgres
```

### Database Queries

```sql
-- Check file upload statistics
SELECT 
  COUNT(*) as total_files,
  SUM(size) as total_size,
  COUNT(DISTINCT "ownerId") as unique_users
FROM "File"
WHERE "isFolder" = false;

-- Recent uploads
SELECT 
  f.name,
  f.size,
  f."mimeType",
  u.email,
  f."createdAt"
FROM "File" f
JOIN "User" u ON f."ownerId" = u.id
WHERE f."isFolder" = false
ORDER BY f."createdAt" DESC
LIMIT 10;
```

## Quick Reference

### Essential Commands

```bash
# Start MinIO
docker-compose up -d espacio-minio

# Stop MinIO
docker-compose stop espacio-minio

# Restart MinIO
docker-compose restart espacio-minio

# View logs
docker logs -f startup-mvp-minio

# Access MinIO console
open http://localhost:9001

# Run bucket setup
docker-compose up espacio-minio-setup

# List buckets
docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
  mc ls myminio/
"
```

### Environment Variables Quick Check

```bash
cd startup-mvp
grep "MINIO_" .env
```

Should show:
```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=espacio-files
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

## Related Documentation

- [File Manager System](./FILE_MANAGER_SYSTEM.md)
- [Docker Compose Configuration](../docker-compose.yml)
- [MinIO Official Documentation](https://min.io/docs/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)

