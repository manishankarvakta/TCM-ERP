# Dokploy Deployment Guide

## Overview

This guide covers deploying the Espacio application on Dokploy, including proper MinIO configuration for file uploads.

## Prerequisites

- Dokploy instance running
- Domain name configured
- SSL certificates (handled by Dokploy/Traefik)
- Docker network `dokploy-network` created

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
│                        ↓                                 │
│              Your Domain (HTTPS)                         │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Dokploy / Traefik                      │  │
│  │      (Reverse Proxy + SSL Termination)          │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Docker Network (dokploy-network)         │  │
│  │                                                   │  │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │  │
│  │  │ Next.js App│  │  MinIO   │  │ PostgreSQL  │ │  │
│  │  │   :3000    │  │  :9000   │  │   :5432     │ │  │
│  │  └────────────┘  └──────────┘  └─────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Critical Configuration for File Uploads

### 1. MINIO_PUBLIC_URL (MOST IMPORTANT!)

**This is the #1 cause of file upload failures in production.**

The `MINIO_PUBLIC_URL` must be accessible from the user's browser, not just from within Docker.

#### ❌ Wrong Configuration (Will Cause 403 Errors):
```bash
MINIO_PUBLIC_URL=http://localhost:9000          # Won't work - localhost is browser's machine
MINIO_PUBLIC_URL=http://espacio-minio:9000     # Won't work - Docker internal name
```

#### ✅ Correct Configurations:

**Option 1: Subdomain (Recommended)**
```bash
MINIO_PUBLIC_URL=https://minio.yourdomain.com
```

**Option 2: Port on Main Domain**
```bash
MINIO_PUBLIC_URL=https://yourdomain.com:9000
```

**Option 3: Path-based (if using Traefik routing)**
```bash
MINIO_PUBLIC_URL=https://yourdomain.com/minio
```

### 2. CORS Configuration

MinIO must allow cross-origin requests from your app domain:

```bash
# In .env.docker or Dokploy environment variables
MINIO_CORS_ORIGIN=https://app.yourdomain.com

# For multiple domains (development + production)
MINIO_CORS_ORIGIN=https://app.yourdomain.com,https://staging.yourdomain.com
```

### 3. SSL Configuration

If your MinIO is behind SSL (recommended):

```bash
MINIO_USE_SSL=true
MINIO_PUBLIC_URL=https://minio.yourdomain.com
```

## Environment Variables

### Required Environment Variables

Create these in Dokploy or in `.env.docker` file:

```bash
# ============================================
# DATABASE CONFIGURATION
# ============================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password-here>
POSTGRES_DB=startup_mvp
POSTGRES_PORT=5432

# ============================================
# MINIO CONFIGURATION (FILE STORAGE)
# ============================================
# CRITICAL: Set this to your actual domain!
MINIO_PUBLIC_URL=https://minio.yourdomain.com
# Set to true once the public domain is reachable (enables presigned URLs)
MINIO_PUBLICLY_ACCESSIBLE=true

# Credentials - use strong passwords in production
MINIO_ROOT_USER=<your-minio-access-key>
MINIO_ROOT_PASSWORD=<your-minio-secret-key>

# Bucket configuration
MINIO_BUCKET_NAME=espacio-files

# SSL - should be true in production
MINIO_USE_SSL=true

# CORS - allow your app domain when MinIO is public
MINIO_CORS_ORIGIN=https://app.yourdomain.com

# Port configuration
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# ============================================
# NEXTAUTH CONFIGURATION
# ============================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<generate-strong-secret-here>

# Your app domain
NEXTAUTH_URL=https://app.yourdomain.com
AUTH_TRUST_HOST=true

# ============================================
# APPLICATION URLS
# ============================================
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# ============================================
# REDIS CONFIGURATION
# ============================================
REDIS_URL=redis://espacio-redis:6379
REDIS_PASSWORD=<strong-redis-password>
REDIS_PORT=6379

# ============================================
# EMAIL CONFIGURATION (Optional)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Espacio
```

## Deployment Steps

### Step 1: Prepare Repository

```bash
# Ensure docker-compose-dokploy.yml is in your repo root
git add docker-compose-dokploy.yml
git commit -m "Add Dokploy deployment configuration"
git push
```

### Step 2: Create Project in Dokploy

1. Log into your Dokploy dashboard
2. Create a new project: "Espacio"
3. Set deployment method to "Docker Compose"
4. Point to your repository

### Step 3: Configure Environment Variables

In Dokploy project settings, add all environment variables from the section above.

**Critical variables to set correctly:**
- `MINIO_PUBLIC_URL` - Must be your actual domain
- `NEXTAUTH_URL` - Your app domain
- `NEXT_PUBLIC_APP_URL` - Your app domain
- `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` - Strong credentials
- `MINIO_PUBLICLY_ACCESSIBLE` - Set to `true` when `minio.yourdomain.com` is reachable so downloads point directly at the public MinIO domain; leave `false` to keep using `/api/files/...`.

### Step 4: Configure MinIO Domain

#### Option A: Using Traefik (Recommended)

Add Traefik labels to MinIO service in `docker-compose-dokploy.yml`:

```yaml
espacio-minio:
  image: minio/minio:latest
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.minio-api.rule=Host(`minio.yourdomain.com`)"
    - "traefik.http.routers.minio-api.entrypoints=websecure"
    - "traefik.http.routers.minio-api.tls.certresolver=letsencrypt"
    - "traefik.http.services.minio-api.loadbalancer.server.port=9000"
    - "traefik.http.routers.minio-console.rule=Host(`minio-console.yourdomain.com`)"
    - "traefik.http.routers.minio-console.entrypoints=websecure"
    - "traefik.http.routers.minio-console.tls.certresolver=letsencrypt"
    - "traefik.http.services.minio-console.loadbalancer.server.port=9001"
  networks:
    - docker-network
    - dokploy-network
```

#### Option B: Using Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/minio.yourdomain.com
server {
    listen 80;
    server_name minio.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name minio.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 5: Deploy

```bash
# In Dokploy dashboard
1. Click "Deploy"
2. Wait for containers to start
3. Check logs for any errors
```

### Step 6: Verify Deployment

```bash
# Check if all containers are running
docker ps | grep startup-mvp

# Check MinIO is accessible
curl https://minio.yourdomain.com/minio/health/live

# Check app is running
curl https://app.yourdomain.com

# Check bucket was created
docker exec startup-mvp-minio mc ls myminio/
```

## Testing File Uploads

### 1. Via Web Interface

1. Open your app at https://app.yourdomain.com
2. Log in
3. Navigate to file upload section
4. Try uploading a file
5. Check browser console for any errors

### 2. Check MinIO Console

1. Open https://minio-console.yourdomain.com (or your configured console URL)
2. Log in with MINIO_ROOT_USER and MINIO_ROOT_PASSWORD
3. Navigate to "Buckets"
4. Check if files are being uploaded

### 3. Check Application Logs

```bash
# View app logs
docker logs -f startup-mvp-app

# View MinIO logs
docker logs -f startup-mvp-minio
```

## Common Issues and Solutions

### Issue 1: 403 Forbidden on Upload

**Symptoms:**
```
Error: Upload failed with status 403
```

**Causes & Solutions:**

#### A. Wrong MINIO_PUBLIC_URL
```bash
# Check current setting
docker exec startup-mvp-app env | grep MINIO_PUBLIC_URL

# Should be your actual domain, not localhost
# Update in Dokploy environment variables and redeploy
```

#### B. CORS Not Configured
```bash
# Check CORS
docker inspect startup-mvp-minio | grep CORS

# Should show: MINIO_API_CORS_ALLOW_ORIGIN=*
# Or your specific domain
```

#### C. Credential Mismatch
```bash
# Check credentials match
docker exec startup-mvp-app env | grep MINIO_
docker inspect startup-mvp-minio | grep MINIO_ROOT_
```

### Issue 2: MinIO Not Accessible from Browser

**Cause:** MinIO not exposed to public internet

**Solutions:**

1. **Add Traefik labels** (see Step 4 above)
2. **Configure reverse proxy** (Nginx/Apache)
3. **Open firewall ports** (9000, 9001)
4. **Check DNS records** point to server

### Issue 3: Database Connection Errors

**Symptoms:**
```
FATAL: could not open file "global/pg_filenode.map"
Error: Schema engine error
Database connection failed
```

**Cause:** PostgreSQL not fully initialized or corrupted volume

**Solutions:**

1. **Improved readiness check (already in docker-compose):**
   - Deployment script now waits up to 60 seconds
   - Tests actual database connection before migrations
   - Auto-retries if not ready

2. **If error persists - corrupted volume:**
   ```bash
   # SSH to server
   ssh root@your-server-ip
   
   # Navigate to project
   cd /path/to/espacio
   
   # Stop containers
   docker-compose -f docker-compose-dokploy.yml down
   
   # Remove corrupted volume
   rm -rf ./volumes/postgres
   
   # Redeploy in Dokploy
   ```

3. **Check logs:**
   ```bash
   docker logs startup-mvp-postgres
   # Look for "database system is ready to accept connections"
   ```

**See also:** [PostgreSQL Troubleshooting Guide](../POSTGRES_TROUBLESHOOTING.md)

### Issue 4: SSL Certificate Issues

**Symptoms:**
```
SSL certificate problem: unable to get local issuer certificate
```

**Solutions:**

1. **Use Let's Encrypt via Traefik:**
   ```yaml
   labels:
     - "traefik.http.routers.minio-api.tls.certresolver=letsencrypt"
   ```

2. **Use Certbot:**
   ```bash
   certbot --nginx -d minio.yourdomain.com
   ```

### Issue 5: Large File Upload Fails

**Cause:** Nginx/Traefik body size limit

**Solutions:**

**Nginx:**
```nginx
client_max_body_size 100M;
```

**Traefik:**
```yaml
labels:
  - "traefik.http.middlewares.limit.buffering.maxRequestBodyBytes=104857600"
```

**MinIO Environment:**
```bash
MINIO_API_REQUESTS_MAX=104857600  # 100MB
```

## Security Best Practices

### 1. Use Strong Credentials

```bash
# Generate strong passwords
MINIO_ROOT_USER=$(openssl rand -hex 16)
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

### 2. Restrict CORS

```bash
# Don't use * in production
MINIO_CORS_ORIGIN=https://app.yourdomain.com
```

### 3. Enable SSL

```bash
MINIO_USE_SSL=true
MINIO_PUBLIC_URL=https://minio.yourdomain.com
```

### 4. Use Private Buckets

Consider using private buckets with presigned URLs only:

```bash
# Remove from minio-setup entrypoint:
# /usr/bin/mc anonymous set public myminio/espacio-files

# Files will only be accessible via presigned URLs
```

### 5. Backup MinIO Data

```bash
# Add to docker-compose
volumes:
  - ./volumes/minio:/data
  - ./backups/minio:/backups

# Schedule backups
0 2 * * * docker exec startup-mvp-minio mc mirror myminio/espacio-files /backups
```

## Monitoring

### Health Checks

```bash
# Application health
curl https://app.yourdomain.com/api/health

# MinIO health
curl https://minio.yourdomain.com/minio/health/live

# Database health
docker exec startup-mvp-postgres pg_isready
```

### Logs

```bash
# Follow all logs
docker-compose -f docker-compose-dokploy.yml logs -f

# Specific service
docker logs -f startup-mvp-app
docker logs -f startup-mvp-minio
docker logs -f startup-mvp-postgres
```

### Storage Usage

```bash
# Check MinIO storage
docker exec startup-mvp-minio du -sh /data

# Check PostgreSQL storage
docker exec startup-mvp-postgres du -sh /var/lib/postgresql/data
```

## Scaling Considerations

### Multiple App Instances

If running multiple app containers:

```yaml
espacio-app:
  deploy:
    replicas: 3
    update_config:
      parallelism: 1
      delay: 10s
```

### MinIO Distributed Mode

For high availability, consider MinIO distributed mode:

```yaml
espacio-minio-1:
  command: server http://espacio-minio-{1...4}/data --console-address ":9001"
  
espacio-minio-2:
  command: server http://espacio-minio-{1...4}/data --console-address ":9001"
  
# ... etc for minio-3 and minio-4
```

### Database Replication

For production, consider PostgreSQL replication:

```yaml
espacio-postgres-replica:
  image: postgres:16-alpine
  environment:
    POSTGRES_PRIMARY_HOST: espacio-postgres
    POSTGRES_PRIMARY_PORT: 5432
```

## Maintenance

### Update Application

```bash
# In Dokploy dashboard
1. Click "Redeploy"
2. Or use Git webhook for auto-deployment
```

### Update Docker Images

```bash
# Pull latest images
docker-compose -f docker-compose-dokploy.yml pull

# Restart services
docker-compose -f docker-compose-dokploy.yml up -d
```

### Database Migrations

Migrations run automatically on deployment. To run manually:

```bash
docker exec startup-mvp-app npx prisma migrate deploy
```

### Backup and Restore

See [Backup System Documentation](./BACKUP_SYSTEM.md)

## Troubleshooting Checklist

- [ ] MINIO_PUBLIC_URL is set to actual domain (not localhost)
- [ ] MinIO is accessible from browser (test: https://minio.yourdomain.com)
- [ ] CORS is configured correctly
- [ ] SSL certificates are valid
- [ ] Firewall allows traffic on ports 9000, 9001
- [ ] DNS records point to server
- [ ] Credentials match between app and MinIO
- [ ] Bucket exists and has correct policy
- [ ] Traefik/Nginx proxy is configured correctly
- [ ] Environment variables are loaded in app

## Quick Reference

### Important URLs

- **App**: https://app.yourdomain.com
- **MinIO API**: https://minio.yourdomain.com
- **MinIO Console**: https://minio-console.yourdomain.com
- **Dokploy Dashboard**: https://dokploy.yourdomain.com

### Important Commands

```bash
# Check container status
docker ps

# View logs
docker logs -f startup-mvp-app

# Access MinIO console
open https://minio-console.yourdomain.com

# Restart services
docker-compose -f docker-compose-dokploy.yml restart

# Check environment variables
docker exec startup-mvp-app env | grep MINIO
```

## Related Documentation

- [File Manager System](./FILE_MANAGER_SYSTEM.md)
- [MinIO Setup & Troubleshooting](./MINIO_SETUP_TROUBLESHOOTING.md)
- [PostgreSQL Troubleshooting](../POSTGRES_TROUBLESHOOTING.md)
- [Data Persistence Strategy](./DATA_PERSISTENCE.md)
- [Main README](../README.md)

