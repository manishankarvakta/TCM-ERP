# MinIO Domain Setup for Dokploy

## 🚨 Issue: MinIO Returns 404

**Problem:** MinIO is not accessible from the internet because it's not exposed via Traefik.

**Solution:** Configure MinIO with Traefik labels and set up DNS records.

---

## ✅ What Was Fixed

Updated `docker-compose-dokploy.yml` to:
1. Add Traefik labels for MinIO API (port 9000)
2. Add Traefik labels for MinIO Console (port 9001)
3. Connect MinIO to `dokploy-network`
4. Changed `ports` to `expose` (Traefik handles external access)

---

## 🌐 DNS Configuration

You need to create **two subdomains** for MinIO:

### 1. MinIO API (for file uploads/downloads)
```
Type: A Record
Name: minio
Value: Your server IP address
Example: minio.espaciobd.com → 123.456.789.0
```

### 2. MinIO Console (web interface)
```
Type: A Record
Name: minio-console
Value: Your server IP address
Example: minio-console.espaciobd.com → 123.456.789.0
```

---

## 🔧 Environment Variables

Add these to your Dokploy environment variables:

### Required Variables

```bash
# MinIO Domains (IMPORTANT!)
MINIO_DOMAIN=minio.espaciobd.com
MINIO_CONSOLE_DOMAIN=minio-console.espaciobd.com

# MinIO Public URL (must match MINIO_DOMAIN)
MINIO_PUBLIC_URL=https://minio.espaciobd.com

# CORS Configuration
MINIO_CORS_ORIGIN=https://app.espaciobd.com

# SSL
MINIO_USE_SSL=true

# Credentials (use strong passwords in production)
MINIO_ROOT_USER=your-access-key
MINIO_ROOT_PASSWORD=your-secret-key

# Bucket
MINIO_BUCKET_NAME=espacio-files
```

### Replace `espaciobd.com` with Your Domain

If your domain is `mydomain.com`, use:
- `MINIO_DOMAIN=minio.mydomain.com`
- `MINIO_CONSOLE_DOMAIN=minio-console.mydomain.com`
- `MINIO_PUBLIC_URL=https://minio.mydomain.com`
- `MINIO_CORS_ORIGIN=https://app.mydomain.com`

---

## 📋 Step-by-Step Setup

### Step 1: Update DNS Records

Go to your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

1. **Add MinIO API subdomain:**
   - Type: A
   - Host: `minio`
   - Value: Your server IP
   - TTL: Automatic (or 300)

2. **Add MinIO Console subdomain:**
   - Type: A
   - Host: `minio-console`
   - Value: Your server IP
   - TTL: Automatic (or 300)

**Wait 5-15 minutes** for DNS propagation.

### Step 2: Verify DNS

```bash
# Check MinIO API DNS
dig minio.espaciobd.com
# Should return your server IP

# Check MinIO Console DNS
dig minio-console.espaciobd.com
# Should return your server IP

# Or use nslookup
nslookup minio.espaciobd.com
nslookup minio-console.espaciobd.com
```

### Step 3: Set Environment Variables in Dokploy

1. Go to your project in Dokploy
2. Click on "Environment" tab
3. Add these variables:

```
MINIO_DOMAIN=minio.espaciobd.com
MINIO_CONSOLE_DOMAIN=minio-console.espaciobd.com
MINIO_PUBLIC_URL=https://minio.espaciobd.com
MINIO_CORS_ORIGIN=https://app.espaciobd.com
MINIO_USE_SSL=true
MINIO_ROOT_USER=your-strong-access-key
MINIO_ROOT_PASSWORD=your-strong-secret-key
```

### Step 4: Commit and Push Changes

```bash
cd /path/to/espacio
git add docker-compose-dokploy.yml
git commit -m "Add Traefik labels for MinIO domain access"
git push origin main
```

### Step 5: Redeploy in Dokploy

1. Go to Dokploy dashboard
2. Click "Redeploy" button
3. Wait for deployment to complete

### Step 6: Verify MinIO is Accessible

```bash
# Test MinIO API health
curl https://minio.espaciobd.com/minio/health/live
# Should return: 200 OK (empty response)

# Test MinIO Console
curl -I https://minio-console.espaciobd.com
# Should return: 200 OK
```

### Step 7: Access MinIO Console

Open in browser:
```
https://minio-console.espaciobd.com
```

Login with:
- **Access Key:** Your `MINIO_ROOT_USER`
- **Secret Key:** Your `MINIO_ROOT_PASSWORD`

---

## 🔍 Verification Checklist

- [ ] DNS records created (minio and minio-console)
- [ ] DNS resolves to server IP
- [ ] Environment variables set in Dokploy
- [ ] Changes committed to git
- [ ] Redeployed in Dokploy
- [ ] MinIO API accessible (curl test passes)
- [ ] MinIO Console accessible (web browser)
- [ ] SSL certificate issued by Let's Encrypt
- [ ] File upload works in application

---

## 🐛 Troubleshooting

### MinIO Still Returns 404

**Check 1: DNS Propagation**
```bash
dig minio.espaciobd.com
# Must return your server IP
```

**Check 2: Traefik Routes**
```bash
# SSH into server
docker logs traefik 2>&1 | grep minio
# Should show routes created
```

**Check 3: Container Network**
```bash
docker inspect startup-mvp-minio | grep -A 10 Networks
# Should show both docker-network and dokploy-network
```

**Check 4: Environment Variables**
```bash
docker exec startup-mvp-app env | grep MINIO
# Should show MINIO_PUBLIC_URL with your domain
```

### SSL Certificate Issues

**Check Traefik Logs:**
```bash
docker logs traefik 2>&1 | grep -i error
```

**Check Certificate:**
```bash
curl -I https://minio.espaciobd.com
# Should NOT show SSL errors
```

**Manual Certificate Check:**
```bash
openssl s_client -connect minio.espaciobd.com:443 -servername minio.espaciobd.com
```

### MinIO Not in Dokploy Network

**Fix:**
```bash
# Ensure docker-compose has both networks
networks:
  - docker-network
  - dokploy-network
```

**Restart:**
```bash
docker-compose -f docker-compose-dokploy.yml up -d espacio-minio
```

---

## 🎯 Alternative: Using Main Domain with Port

If you don't want subdomains, you can use ports:

### Option A: Port-based Access

**Environment Variables:**
```bash
MINIO_PUBLIC_URL=https://espaciobd.com:9000
MINIO_CORS_ORIGIN=https://app.espaciobd.com
```

**Firewall:**
```bash
# Open ports 9000 and 9001
sudo ufw allow 9000
sudo ufw allow 9001
```

**docker-compose:**
```yaml
espacio-minio:
  ports:
    - "9000:9000"
    - "9001:9001"
  # Remove Traefik labels
```

**Note:** Not recommended for production. Subdomains are cleaner.

---

## 🎯 Alternative: Path-based Routing

Use `/minio/` path instead of subdomain:

**Traefik Labels:**
```yaml
labels:
  - "traefik.http.routers.minio-api.rule=Host(`espaciobd.com`) && PathPrefix(`/minio/`)"
  - "traefik.http.middlewares.minio-strip.stripprefix.prefixes=/minio"
  - "traefik.http.routers.minio-api.middlewares=minio-strip"
```

**Environment:**
```bash
MINIO_PUBLIC_URL=https://espaciobd.com/minio
```

**Note:** More complex, subdomains recommended.

---

## ✅ Recommended Configuration

For production, use **subdomains** with **SSL**:

```
✅ MinIO API:     https://minio.espaciobd.com
✅ MinIO Console: https://minio-console.espaciobd.com
✅ Application:   https://app.espaciobd.com
```

**Benefits:**
- Clean URLs
- Automatic SSL via Let's Encrypt
- Easy CORS configuration
- Industry standard

---

## 📚 Quick Reference

### MinIO API Endpoints

```bash
# Health check
GET https://minio.espaciobd.com/minio/health/live

# Bucket list (requires auth)
GET https://minio.espaciobd.com/

# File upload (via presigned URL from app)
PUT https://minio.espaciobd.com/espacio-files/user-id/file.jpg
```

### MinIO Console

```bash
# Web interface
https://minio-console.espaciobd.com

# Login credentials
Access Key: MINIO_ROOT_USER
Secret Key: MINIO_ROOT_PASSWORD
```

### Application Config

```bash
# In Dokploy environment
MINIO_ENDPOINT=espacio-minio          # Internal Docker name
MINIO_PUBLIC_URL=https://minio.espaciobd.com  # External URL
MINIO_USE_SSL=true
MINIO_CORS_ORIGIN=https://app.espaciobd.com
```

---

## 🎉 After Setup

Once configured correctly:

1. ✅ MinIO API accessible at `https://minio.espaciobd.com`
2. ✅ MinIO Console accessible at `https://minio-console.espaciobd.com`
3. ✅ SSL certificates auto-issued by Let's Encrypt
4. ✅ File uploads work from your application
5. ✅ CORS configured correctly
6. ✅ Production-ready

---

## 📞 Support

If you still get 404:

1. Check DNS: `dig minio.espaciobd.com`
2. Check Traefik logs: `docker logs traefik`
3. Check MinIO logs: `docker logs startup-mvp-minio`
4. Verify environment variables in Dokploy
5. Ensure both networks are configured
6. Wait 5-15 minutes for DNS propagation

---

**Summary:** Configure DNS records, set environment variables, redeploy, and MinIO will be accessible! 🚀

