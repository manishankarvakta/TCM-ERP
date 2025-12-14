# Dokploy Deployment Guide

> 📖 **For complete step-by-step deployment instructions, see [DOKPLOY_DEPLOYMENT_GUIDE.md](./DOKPLOY_DEPLOYMENT_GUIDE.md)**

This document provides technical details about the Dokploy configuration and explains the differences between local and Dokploy deployments.

## Differences from Local Docker Compose

The `docker-compose-dokploy.yml` file has been optimized for Dokploy with the following changes:

### 1. Network Configuration
- **Local**: Uses custom `app-network` (bridge driver) with bind mounts
- **Dokploy**: Uses `app-network` (bridge driver) with named volumes for better portability

### 2. Environment Variables
- **Local**: Uses default values with `${VAR:-default}` syntax in `docker-compose.yml`
- **Dokploy**: Uses default values but can be overridden via Dokploy UI environment variables

### 3. Volume Management
- **Local**: Uses bind mounts (`./volumes/postgres`, `./volumes/minio`, etc.) in `docker-compose.yml`
- **Dokploy**: Uses named volumes (`postgres_data`, `minio_data`, `redis_data`) for better portability and Dokploy management

### 4. Service Names
- All services use the `espacio-` prefix for better organization
- Services: `espacio-postgres`, `espacio-minio`, `espacio-minio-setup`, `espacio-redis`, `espacio-app`

## Required Environment Variables in Dokploy

Set these environment variables in Dokploy's UI:

### Database Configuration
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=espaciodb
POSTGRES_PORT=5432
```

### MinIO Configuration
```
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-password
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET_NAME=uploads
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=http://your-domain:9000
NEXT_PUBLIC_MINIO_URL=http://your-domain:9000
```

### Application Configuration
```
APP_PORT=3000
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Redis Configuration
```
REDIS_PORT=6379
REDIS_URL=redis://espacio-redis:6379
```

### Email Configuration
```
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
EMAIL_FROM=your-email@domain.com
EMAIL_FROM_NAME=Espacio
```

## Deployment Steps

1. **Ensure Dokploy Network Exists**
   - Dokploy should automatically create the `dokploy-network`
   - If not, create it manually: `docker network create dokploy-network`

2. **Use Docker Compose + select the correct compose file**
   - In Dokploy UI, create a new application
   - Select **"Docker Compose"** as the deployment type (**NOT** "Dockerfile")
   - Upload or paste the contents of `docker-compose-dokploy.yml`
   - **Important**: Ensure the build context is set to `./startup-mvp` and dockerfile is `Dockerfile`
   - If Dokploy asks for a "Dockerfile path" while you're using Compose, **do not** point it at a compose yaml (that causes errors like `unknown instruction: services:`)

3. **Configure Environment Variables**
   - Add all required environment variables in Dokploy's environment section
   - Make sure to set secure passwords and secrets

4. **Deploy**
   - Click deploy in Dokploy UI
   - Dokploy will build and start all services

5. **Verify Services**
   - Check that all services are healthy
   - Access your application at the configured domain
   - MinIO console available at configured `MINIO_CONSOLE_PORT`

## Important Notes

- **Network**: The `app-network` is created automatically by Docker Compose.
- **Volumes**: Named volumes are managed by Docker and persist data across deployments.
- **Secrets**: Never commit sensitive values. Use Dokploy's secret management features.
- **Ports**: Ensure ports don't conflict with other services in Dokploy.
- **Build Context**: The build context is `./startup-mvp` and dockerfile is `Dockerfile` - ensure this path is correct in your Dokploy setup.
- **Service Names**: All services use the `espacio-` prefix for better organization.
- **Health Checks**: All services have health checks configured for better reliability.

## Troubleshooting

### Network Issues
If you see network-related errors:
```bash
docker network ls | grep app-network
# The app-network is created automatically by docker-compose
```

### Environment Variable Issues
- Verify all required variables are set in Dokploy UI
- Check service logs for missing variable errors
- Ensure no default values are needed (Dokploy version doesn't use defaults)

### Volume Issues
- Named volumes are created automatically by Docker
- Check volume status: `docker volume ls`
- Dokploy manages volume lifecycle

## Migration from Standard Docker Compose

If migrating from `docker-compose.yml` (local):

1. **Export Data** (if needed):
   ```bash
   docker-compose -f docker-compose.yml exec postgres pg_dump -U postgres startup_mvp > backup.sql
   ```

2. **Stop Old Services**:
   ```bash
   docker-compose -f docker-compose.yml down
   ```

3. **Deploy to Dokploy**:
   - Use `docker-compose-dokploy.yml` in Dokploy
   - Configure environment variables
   - Deploy

4. **Import Data** (if needed):
   - Connect to new PostgreSQL instance
   - Import backup: `psql -U postgres -d startup_mvp < backup.sql`

