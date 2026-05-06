# 🚀 Dokploy Deployment Guide

Complete guide to deploy the Startup MVP application on Dokploy.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Install Dokploy](#step-1-install-dokploy)
- [Step 2: Create Application in Dokploy](#step-2-create-application-in-dokploy)
- [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
- [Step 4: Configure Domain & SSL](#step-4-configure-domain--ssl)
- [Step 5: Deploy Application](#step-5-deploy-application)
- [Step 6: Verify Deployment](#step-6-verify-deployment)
- [Step 7: Access Application](#step-7-access-application)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Prerequisites

### Server Requirements
- **VPS/Server**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended
- **Domain**: A domain name pointed to your server's IP

### Local Requirements
- Git repository access
- SSH access to your server
- Domain DNS configured

---

## Step 1: Install Dokploy

### 1.1 Connect to Your Server

```bash
ssh root@your-server-ip
```

### 1.2 Install Dokploy

Run the official Dokploy installation command:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Wait for the installation to complete (5-10 minutes).

### 1.3 Access Dokploy Dashboard

1. Open your browser and navigate to: `http://your-server-ip:3000`
2. Complete the initial setup wizard
3. Create your admin account
4. Login to Dokploy dashboard

---

## Step 2: Create Application in Dokploy

### 2.1 Create a New Project

1. Click **"Create Project"** in the Dokploy dashboard
2. Enter project name: `espacio` (or your preferred name)
3. Click **"Create"**

### 2.2 Add Docker Compose Application

1. Inside your project, click **"Add Service"**
2. Select **"Docker Compose"**
3. Configure the following:

   **Basic Settings:**
   - **Name**: `startup-mvp`
   - **Repository URL**: Your Git repository URL
     ```
     https://github.com/your-username/espacio.git
     ```
   - **Branch**: `main` (or your deployment branch)
   - **Compose File Path**: `docker-compose-dokploy.yml`

   **Build Settings:**
   - **Build Path**: `/` (root directory)
   - **Auto Deploy**: Enable (optional)

4. Click **"Create"**

---

## Step 3: Configure Environment Variables

### 3.1 Add Environment Variables

In your application settings, go to **"Environment"** tab and add the following variables:

#### Database Configuration
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-database-password
POSTGRES_DB=startup_mvp
POSTGRES_PORT=5432
```

#### NextAuth Configuration
```env
NEXTAUTH_SECRET=your-random-32-char-secret-here
NEXTAUTH_URL=https://app.espaciobd.com
AUTH_TRUST_HOST=true
```

> **Generate NEXTAUTH_SECRET**: Run this command locally:
> ```bash
> openssl rand -base64 32
> ```

#### Application URLs
```env
NEXT_PUBLIC_APP_URL=https://app.espaciobd.com
APP_PORT=3000
```


#### Redis Configuration (Optional)
```env
REDIS_PORT=6379
REDIS_URL=redis://espacio-redis:6379
```

#### Email Configuration (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Startup MVP
```

> **Note**: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)

### 3.2 Save Environment Variables

Click **"Save"** after adding all variables.

---

## Step 4: Configure Domain & SSL

### 4.1 Point Domain to Server

Update your domain's DNS records:

**A Record:**
```
Type: A
Name: app (or @)
Value: your-server-ip
TTL: 3600
```

Wait for DNS propagation (5-30 minutes).

### 4.2 Configure Domain in Dokploy

1. Go to your application in Dokploy
2. Click **"Domains"** tab
3. Click **"Add Domain"**
4. Enter your domain: `app.espaciobd.com`
5. Enable **"Generate SSL Certificate"** (Let's Encrypt)
6. **Container Port**: `3000`
7. Click **"Save"**

### 4.3 Wait for SSL Certificate

Dokploy will automatically generate an SSL certificate using Let's Encrypt. This takes 1-2 minutes.

---

## Step 5: Deploy Application

### 5.1 Build and Deploy

1. Go to your application in Dokploy
2. Click **"Deploy"** button
3. Select **"Build & Deploy"**
4. Wait for the deployment to complete

### 5.2 Monitor Deployment

Watch the deployment logs in real-time:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 STARTING APPLICATION DEPLOYMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Waiting for database to be ready...
📊 Running database migrations...
✅ Database migrations completed successfully

🌱 SEEDING: Admin User & Organization
🔐 Hashing admin password...
👤 Creating/updating admin user...
✅ Admin user ready: admin@example.com
🏢 Creating/updating default organization...
✅ Organization ready: Default Organization
✅ SUCCESS: Seeding completed!
📧 Login credentials: admin@example.com / admin123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 DEPLOYMENT READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Starting application server...
```

### 5.3 Deployment Time

- **First deployment**: 10-15 minutes (includes Docker build)
- **Subsequent deployments**: 5-10 minutes

---

## Step 6: Verify Deployment

### 6.1 Check Service Status

In Dokploy, verify all services are running:

- ✅ `espacio-app` (Next.js Application)
- ✅ `espacio-postgres` (PostgreSQL Database)
- ✅ `espacio-redis` (Redis Cache)

### 6.2 Check Application Health

```bash
curl https://app.espaciobd.com/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 6.3 Verify SSL Certificate

1. Visit `https://app.espaciobd.com`
2. Check for the padlock icon in the browser
3. Certificate should be issued by Let's Encrypt

---

## Step 7: Access Application

### 7.1 Default Admin Credentials

```
Email: admin@example.com
Password: admin123
```

> ⚠️ **IMPORTANT**: Change the admin password immediately after first login!

### 7.2 First Login Steps

1. Navigate to `https://app.espaciobd.com`
2. Click **"Sign In"**
3. Enter admin credentials
4. You'll be redirected to the dashboard

### 7.3 Change Admin Password

1. Go to **Profile** > **Settings**
2. Click **"Change Password"**
3. Enter new secure password
4. Save changes

### 7.4 Create Additional Data

The admin can now create:
- **Users**: Add team members and assign roles
- **Units**: Create measurement units (m, ft, sqm, etc.)
- **Categories**: Organize items by category
- **Items**: Add products/services to the catalog
- **Clients**: Add customer information
- **Suppliers**: Add supplier information
- **Quotations**: Create and manage quotations

---

## Troubleshooting

### Issue 1: 404 Page Not Found

**Symptoms:**
- Application deployed successfully
- Domain shows 404 error

**Solution:**
```bash
# Check if app is connected to dokploy-network
docker network inspect dokploy-network

# Restart the application
# In Dokploy: Application > Actions > Restart
```

**Root Cause:** App not connected to Traefik network.

---

### Issue 2: SSL Certificate Not Generated

**Symptoms:**
- Domain accessible via HTTP but not HTTPS
- "Certificate not found" error

**Solution:**
1. Verify DNS is pointing to correct IP
2. Check domain configuration in Dokploy
3. Ensure port 443 is open on server
4. Regenerate certificate:
   - Dokploy > Domains > Remove domain
   - Add domain again with SSL enabled

**Check DNS:**
```bash
dig app.espaciobd.com
nslookup app.espaciobd.com
```

---

### Issue 3: Database Connection Failed

**Symptoms:**
- Application logs show "Database connection error"
- Login page doesn't work

**Solution:**
```bash
# Check PostgreSQL logs in Dokploy
# Verify DATABASE_URL environment variable format:
# postgresql://user:password@host:5432/database?schema=public

# Restart PostgreSQL service
# In Dokploy: Services > espacio-postgres > Restart
```

---

### Issue 4: "No users found" Error

**Symptoms:**
- Unit seeding fails
- Error: "No users found in DB"

**Solution:**
```bash
# Run user seeding manually:
# 1. Access application container shell in Dokploy
# 2. Run:
tsx prisma/seed-users.ts
```

**Prevention:** This is now handled automatically in the deployment script.

---


---

### Issue 6: Authentication Errors

**Symptoms:**
- `UntrustedHost` error
- `CredentialsSignin` error
- Login page shows 500 error

**Solutions:**

**For UntrustedHost:**
- Verify `NEXTAUTH_URL` matches your domain exactly
- Ensure `AUTH_TRUST_HOST=true` is set
- Check that domain includes `https://`

**For CredentialsSignin:**
- Verify admin user was seeded (check deployment logs)
- Ensure bcryptjs is installed (should be automatic)
- Try using correct credentials: `admin@example.com` / `admin123`

---

### Issue 7: Prisma Version Mismatch

**Symptoms:**
- Migration fails with "url property no longer supported"
- Prisma 7.x errors

**Solution:**
This is already fixed in `docker-compose-dokploy.yml`:
```bash
npx prisma@6.18.0 db push
```

If you still see this issue, verify the docker-compose file is using `prisma@6.18.0`.

---

## Maintenance

### Update Application

1. Push changes to your Git repository
2. In Dokploy, click **"Deploy"** > **"Build & Deploy"**
3. Wait for deployment to complete

### View Logs

**Application Logs:**
- Dokploy > Application > Logs tab
- Real-time log streaming

**Service-specific Logs:**
```bash
# PostgreSQL
docker logs startup-mvp-postgres


# Redis
docker logs startup-mvp-redis
```

### Backup Database

**Manual Backup:**
```bash
# Access server via SSH
docker exec startup-mvp-postgres pg_dump -U postgres startup_mvp > backup.sql
```

**Automated Backups:**
Configure in Dokploy > Backups > Schedule

### Scale Resources

**Increase Memory:**
1. Dokploy > Application > Resources
2. Adjust memory limits
3. Restart application

**Add More Instances:**
1. Dokploy > Application > Scale
2. Set number of instances
3. Apply changes

### Monitor Performance

**Built-in Monitoring:**
- CPU Usage: Dokploy > Application > Monitoring
- Memory Usage: Dokploy > Application > Monitoring
- Network: Dokploy > Application > Monitoring

**Custom Monitoring:**
- Application provides `/api/health` endpoint
- Set up Uptime Kuma or similar tool

---

## Security Best Practices

### 1. Change Default Passwords

Immediately after deployment:
- ✅ Change admin@example.com password
- ✅ Update POSTGRES_PASSWORD
- ✅ Generate new NEXTAUTH_SECRET

### 2. Enable Firewall

```bash
# Allow only necessary ports
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw allow 3000    # Dokploy (optional, can be restricted)
ufw enable
```

### 3. Regular Updates

```bash
# Update Dokploy
curl -sSL https://dokploy.com/update.sh | sh

# Update system packages
apt update && apt upgrade -y
```

### 4. SSL Certificate Renewal

Let's Encrypt certificates auto-renew. Verify:
```bash
# Check certificate expiry
echo | openssl s_client -servername app.espaciobd.com -connect app.espaciobd.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 5. Database Backups

Set up automated backups:
1. Dokploy > Backups > Configure
2. Set schedule (daily recommended)
3. Configure retention period

---

## Environment-Specific Configuration

### Production Recommendations

```env
# Strong passwords
POSTGRES_PASSWORD=use-strong-random-password-here

# Secure secrets
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Email (required for password resets)
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Domain
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Staging Environment

```env
# Use separate database
POSTGRES_DB=startup_mvp_staging

# Different domain
NEXTAUTH_URL=https://staging.yourdomain.com
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com

# Optional: Disable email in staging
SMTP_HOST=
```

---

## Additional Resources

### Official Documentation
- **Dokploy Docs**: https://docs.dokploy.com
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth Docs**: https://authjs.dev

### Support
- **GitHub Issues**: Create an issue in your repository
- **Dokploy Discord**: Join for community support
- **Application Logs**: Check Dokploy dashboard for errors

### Useful Commands

```bash
# Restart specific service
docker restart startup-mvp-app

# View PostgreSQL logs
docker logs -f startup-mvp-postgres

# Connect to PostgreSQL
docker exec -it startup-mvp-postgres psql -U postgres -d startup_mvp

# Check disk space
df -h

# Check memory usage
free -h

# Check Docker resources
docker stats
```

---

## Quick Reference

### Service URLs
- **Application**: `https://app.espaciobd.com`
- **Dokploy Dashboard**: `http://server-ip:3000`

### Default Credentials
- **Application Admin**: `admin@example.com` / `admin123`
- **PostgreSQL**: `postgres` / `postgres` (or your configured password)

### Important Files
- **Docker Compose**: `docker-compose-dokploy.yml`
- **Dockerfile**: `startup-mvp/Dockerfile`
- **Prisma Schema**: `startup-mvp/prisma/schema.prisma`
- **User Seed**: `startup-mvp/prisma/seed-users.ts`

### Network Configuration
- **Internal Network**: `docker-network` (services communicate)
- **External Network**: `dokploy-network` (Traefik routing)

---

## Conclusion

Your Startup MVP application is now successfully deployed on Dokploy! 🎉

**What You Have:**
- ✅ Secure HTTPS application
- ✅ PostgreSQL database with migrations
- ✅ Redis caching
- ✅ Admin user ready to use
- ✅ Automatic SSL certificate renewal
- ✅ Production-ready setup

**Next Steps:**
1. Login as admin
2. Change default password
3. Configure email settings
4. Add your team members
5. Start creating quotations!

**Need Help?**
- Check the [Troubleshooting](#troubleshooting) section
- Review deployment logs in Dokploy
- Consult the official documentation

Happy deploying! 🚀

