# Dokploy Deployment Guide

This guide explains how to deploy the application using Dokploy with the `docker-compose.dokploy.yml` configuration.

## Differences from Standard Docker Compose

The `docker-compose.dokploy.yml` file has been optimized for Dokploy with the following changes:

### 1. Network Configuration
- **Standard**: Uses custom `app-network` (bridge driver)
- **Dokploy**: Uses external `dokploy-network` (managed by Dokploy)

### 2. Environment Variables
- **Standard**: Uses default values with `${VAR:-default}` syntax
- **Dokploy**: References variables directly (no defaults) - Dokploy UI manages all environment variables

### 3. Volume Management
- **Standard**: Uses bind mounts (`./volumes/postgres`, `./volumes/minio`, etc.)
- **Dokploy**: Uses named volumes (`postgres_data`, `minio_data`, `redis_data`) for better portability and Dokploy management

## Required Environment Variables in Dokploy

Set these environment variables in Dokploy's UI:

### Database Configuration
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=startup_mvp
POSTGRES_PORT=5432
```

### MinIO Configuration
```
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-password
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET_NAME=startup-mvp-files
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=http://your-domain:9000
```

### Application Configuration
```
APP_PORT=3000
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Redis Configuration (Optional)
```
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
```

### Email Configuration
```
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=your-email-password
EMAIL_FROM=no-reply@techsoulbd.com
EMAIL_FROM_NAME=Startup MVP
```

## Deployment Steps

1. **Ensure Dokploy Network Exists**
   - Dokploy should automatically create the `dokploy-network`
   - If not, create it manually: `docker network create dokploy-network`

2. **Upload docker-compose.dokploy.yml**
   - In Dokploy UI, create a new application
   - Upload or paste the contents of `docker-compose.dokploy.yml`

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

- **Network**: The `dokploy-network` must exist before deployment. Dokploy typically creates this automatically.
- **Volumes**: Named volumes are managed by Dokploy and persist data across deployments.
- **Secrets**: Never commit sensitive values. Use Dokploy's secret management features.
- **Ports**: Ensure ports don't conflict with other services in Dokploy.
- **Build Context**: The build context points to `./startup-mvp` - ensure this path is correct in your Dokploy setup.

## Troubleshooting

### Network Issues
If you see network-related errors:
```bash
docker network ls | grep dokploy
docker network create dokploy-network  # Only if it doesn't exist
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

If migrating from `docker-compose.yml`:

1. **Export Data** (if needed):
   ```bash
   docker-compose -f docker-compose.yml exec postgres pg_dump -U postgres startup_mvp > backup.sql
   ```

2. **Stop Old Services**:
   ```bash
   docker-compose -f docker-compose.yml down
   ```

3. **Deploy to Dokploy**:
   - Use `docker-compose.dokploy.yml` in Dokploy
   - Configure environment variables
   - Deploy

4. **Import Data** (if needed):
   - Connect to new PostgreSQL instance
   - Import backup: `psql -U postgres -d startup_mvp < backup.sql`

