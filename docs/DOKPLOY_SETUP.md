# Dokploy Deployment Guide

> 📖 **For complete step-by-step deployment instructions, see [DOKPLOY_DEPLOYMENT_GUIDE.md](./DOKPLOY_DEPLOYMENT_GUIDE.md)**

This document provides technical details about the Dokploy configuration and explains the differences between local and Dokploy deployments.

## IMPORTANT: Database Migrations and Data Persistence

### 1. Data Persistence (Docker Named Volumes)
The `docker-compose-dokploy.yml` uses **Docker Named Volumes** (e.g., `fferp-postgres-data`) instead of relative local bind mounts (`./volumes/postgres`).
This is CRITICAL because Dokploy wipes out the local project folder (`./`) on every deployment. Named volumes ensure that your database, uploaded files, and Redis cache safely persist across all deployments.

### 2. Database Migrations
The deployment container automatically runs `prisma migrate deploy` on startup. 
**HOWEVER**, for this to work correctly, you **MUST** generate and commit migration files locally before pushing to GitHub.
Whenever you change `schema.prisma`, you need to run:
```bash
npx prisma migrate dev --name <describe-change>
```
Then commit the newly generated folder inside `prisma/migrations/` to Git. If you only modify `schema.prisma` without committing a migration file, your production database will NOT be updated, which can lead to application crashes.

---

## Differences from Local Docker Compose

The `docker-compose-dokploy.yml` file has been optimized for Dokploy with the following changes:

### 1. Network Configuration
- **Local**: Uses custom `docker-network` (bridge driver) with relative bind mounts.
- **Dokploy**: Uses `docker-network` and `dokploy-network` (external) for routing, along with secure named volumes.

### 2. Environment Variables
- **Local**: Uses default values with `${VAR:-default}` syntax in `docker-compose.yml`.
- **Dokploy**: Uses default values but must be securely overridden via the Dokploy UI Environment Variables tab.

### 3. Volume Management
- **Local**: Uses bind mounts (`./volumes/postgres`, `./volumes/uploads`, etc.) in `docker-compose.yml`.
- **Dokploy**: Uses named volumes (`fferp-postgres-data`, `fferp-uploads-data`, `fferp-redis-data`) for secure data persistence managed entirely by Docker.

### 4. Service Names
- All services use the `fferp-` prefix for better organization.
- Services: `fferp-postgres`, `fferp-app`, `fferp-redis`

## Required Environment Variables in Dokploy

Set these environment variables in Dokploy's UI:

### Database Configuration
```ini
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=startup_mvp
DATABASE_URL=postgresql://postgres:your-secure-password@fferp-postgres:5432/startup_mvp?schema=public
```

### Application Configuration
```ini
PORT=3000
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-domain.com
AUTH_URL=https://your-domain.com
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Redis Configuration (Optional)
```ini
REDIS_URL=redis://fferp-redis:6379
```

### Email Configuration
```ini
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
EMAIL_FROM=your-email@domain.com
EMAIL_FROM_NAME=ffERP
```

## Deployment Steps

1. **Ensure Dokploy Network Exists**
   - Dokploy should automatically create the `dokploy-network`
   - If not, create it manually via SSH: `docker network create dokploy-network`

2. **Deploy using Docker Compose**
   - In Dokploy UI, create a new application
   - Select **"Docker Compose"** as the deployment type (**NOT** "Dockerfile")
   - Copy and paste the contents of `docker-compose-dokploy.yml`
   - **Important**: Ensure the build context is set to `./startup-mvp` and dockerfile is `Dockerfile`

3. **Configure Environment Variables**
   - Add all required environment variables in Dokploy's environment section
   - Make sure to set secure passwords and secrets

4. **Deploy**
   - Click deploy in Dokploy UI
   - Dokploy will build the Next.js app and start all services

5. **Verify Services**
   - Check that all services are healthy in the Dokploy dashboard
   - Access your application at the configured domain

## Important Notes

- **Volumes**: Named volumes are managed by Docker and persist data across deployments. They will not be deleted when you deploy new code.
- **Secrets**: Never commit sensitive values like `NEXTAUTH_SECRET` or `POSTGRES_PASSWORD`. Use Dokploy's secret management features.
- **Ports**: Ensure ports don't conflict with other services in Dokploy.
- **Health Checks**: All services have health checks configured for better reliability.

## Troubleshooting

### Volume Issues / Data Not Saving
If data is not saving, ensure that you have not accidentally reverted back to using `./volumes/postgres` in your compose file. Only Docker Named Volumes (`fferp-postgres-data`) persist correctly inside Dokploy.

### "Table does not exist" Errors
If you see "Invalid prisma invocation: The table public.User does not exist in the current database":
1. Verify that the `fferp-postgres-data` volume is correctly mounted.
2. Verify that you have generated local migrations (`npx prisma migrate dev`) and pushed the `prisma/migrations` folder to GitHub before deploying.

### Environment Variable Issues
- Verify all required variables are set in Dokploy UI
- Check service logs for missing variable errors
