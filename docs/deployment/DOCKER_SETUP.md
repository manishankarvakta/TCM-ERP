# Docker Setup Guide

This guide explains how to run the startup-mvp application using Docker Compose with PostgreSQL and MinIO.

## Project Structure

```
APP_TEMPLATE/
├── startup-mvp/          # Next.js application
├── docker-compose.yml    # Docker Compose configuration (root level)
├── volumes/              # Docker volume data
│   ├── postgres/         # PostgreSQL data
│   ├── minio/            # MinIO data
│   └── redis/            # Redis data
└── .env.docker           # Environment variables (create from env.docker.example)
```

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v3.8 or higher

## Quick Start

1. **Navigate to the root directory (APP_TEMPLATE):**
   ```bash
   cd /path/to/APP_TEMPLATE
   ```

2. **Copy the environment file:**
   ```bash
   cp env.docker.example .env.docker
   ```

3. **Update environment variables** in `.env.docker` at the root level with your values:
   - Update PostgreSQL credentials (if needed)
   - Update MinIO credentials (if needed)
   - Update email configuration
   - Update NextAuth secret (generate a new one for production)

4. **Build and start all services:**
   ```bash
   docker-compose up -d
   ```
   
   Note: The application will automatically run migrations on startup. If you need to run them manually:
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Seed the database (optional):**
   ```bash
   docker-compose exec app npm run prisma:seed
   ```

## Services

### PostgreSQL Database
- **Port:** 5432 (default)
- **Database:** startup_mvp (default)
- **User:** postgres (default)
- **Password:** postgres (default)
- **Access:** `postgresql://postgres:postgres@localhost:5432/startup_mvp`

### MinIO Object Storage
- **API Port:** 9000 (default)
- **Console Port:** 9001 (default)
- **Access Key:** minioadmin (default)
- **Secret Key:** minioadmin (default)
- **Console URL:** http://localhost:9001
- **Default Bucket:** startup-mvp-files

### Next.js Application
- **Port:** 3000 (default)
- **URL:** http://localhost:3000

### Redis (Optional)
- **Port:** 6379 (default)

## Useful Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f minio
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes data)
```bash
docker-compose down -v
# This will remove named volumes, but local volumes in ./volumes/ will remain
# To completely remove local volumes:
rm -rf volumes/postgres/* volumes/minio/* volumes/redis/*
```

### Rebuild application
```bash
docker-compose build app
docker-compose up -d app
```

### Access database
```bash
docker-compose exec postgres psql -U postgres -d startup_mvp
```

### Access MinIO Console
1. Open http://localhost:9001 in your browser
2. Login with MinIO credentials (default: minioadmin/minioadmin)

### Run Prisma commands
```bash
# Generate Prisma Client
docker-compose exec app npx prisma generate

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec app npx prisma studio
```

### Access application shell
```bash
docker-compose exec app sh
```

## Volume Data

All Docker volume data is stored in the `volumes/` directory at the root level:
- **PostgreSQL data:** `volumes/postgres/`
- **MinIO data:** `volumes/minio/`
- **Redis data:** `volumes/redis/`

These directories are created automatically when you first run `docker-compose up`.

## Environment Variables

All environment variables are configured in `.env.docker` at the root level (APP_TEMPLATE/). Key variables:

- **DATABASE_URL:** Automatically set based on PostgreSQL service
- **MINIO_ENDPOINT:** Automatically set to `minio` (internal Docker network)
- **MINIO_PUBLIC_URL:** Public URL for MinIO (default: http://localhost:9000)

## Production Considerations

For production deployment:

1. **Change all default passwords:**
   - PostgreSQL password
   - MinIO root credentials
   - NextAuth secret (generate a strong secret)

2. **Use environment-specific files:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Enable SSL for MinIO:**
   - Set `MINIO_USE_SSL=true`
   - Update `MINIO_PUBLIC_URL` to use HTTPS
   - Configure SSL certificates

4. **Use secrets management:**
   - Consider using Docker secrets or external secret management
   - Never commit `.env.docker` to version control

5. **Configure backups:**
   - Set up regular PostgreSQL backups
   - Set up MinIO data backups

6. **Resource limits:**
   - Add resource limits to services in docker-compose.yml
   - Monitor resource usage

## Troubleshooting

### Database connection issues
- Check if PostgreSQL is healthy: `docker-compose ps`
- Verify DATABASE_URL in container: `docker-compose exec app env | grep DATABASE_URL`

### MinIO connection issues
- Access MinIO console at http://localhost:9001
- Check MinIO logs: `docker-compose logs minio`
- Verify bucket exists: `docker-compose logs minio-setup`

### Application not starting
- Check application logs: `docker-compose logs app`
- Verify all dependencies are healthy: `docker-compose ps`
- Check if migrations ran successfully

### Port conflicts
- If ports are already in use, update them in `.env.docker`
- Check what's using the port: `lsof -i :3000` (macOS/Linux)

## Development vs Production

### Development
- Use `docker-compose up` (without `-d`) to see logs
- Hot reload is not available in Docker, rebuild after changes
- Use `docker-compose exec app npm run dev` for development mode (requires rebuilding)

### Production
- Always use `docker-compose up -d` to run in detached mode
- Use `output: 'standalone'` in next.config.ts (already configured)
- Ensure all environment variables are properly set
- Use proper secrets management

