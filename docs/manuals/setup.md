# Espacio - Docker Compose Setup for Dokploy

Complete isolated setup with PostgreSQL, MinIO, Redis, and Next.js.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Dokploy running on your server
- Domain pointed to your server (app.espaciobd.com)

## 🚀 Quick Start

### 1. Project Structure

```
your-project/
├── docker-compose.yml
├── .env
├── startup-mvp/
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── pages/api/health.js (or app/api/health/route.js)
```

### 2. Create Environment File

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Generate secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Update next.config.js

Ensure your Next.js config has standalone output:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... other config
}

module.exports = nextConfig
```

### 4. Add Health Check Endpoint

**For Pages Router:** Create `pages/api/health.js`
**For App Router:** Create `app/api/health/route.js`

See the "Health Check Endpoint" artifact for code.

### 5. Deploy with Dokploy

#### Option A: Via Dokploy UI (Recommended)

1. Create new application in Dokploy
2. Select "Docker Compose" as source
3. Upload your `docker-compose.yml`
4. Set environment variables in Dokploy
5. Go to "Domains" tab
6. Add domain: `app.espaciobd.com`
7. Port: `3000`
8. Enable SSL
9. Deploy!

#### Option B: Manual Deploy

```bash
# Deploy the stack
docker-compose up -d

# Check logs
docker logs espacio-app -f

# Check all services
docker-compose ps
```

## 🔍 Verification

### Check if services are running:

```bash
# Check all containers
docker-compose ps

# Check app health
docker exec espacio-app wget -O- http://localhost:3000/api/health

# Check database
docker exec espacio-postgres pg_isready -U postgres

# Check MinIO
docker exec espacio-minio curl -f http://localhost:9000/minio/health/live

# Check Redis
docker exec espacio-redis redis-cli --pass redis123 ping
```

### Check logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker logs espacio-app -f
docker logs espacio-postgres -f
docker logs espacio-minio -f
docker logs espacio-redis -f
```

## 🌐 Access Points

- **Application:** https://app.espaciobd.com (via Dokploy)
- **Internal Services:** (not exposed to host)
  - PostgreSQL: `postgres:5432` (internal only)
  - MinIO: `minio:9000` (internal only)
  - Redis: `redis:6379` (internal only)

## 🔧 Troubleshooting

### 502 Bad Gateway
- Check if app container is running: `docker ps | grep espacio-app`
- Check app logs: `docker logs espacio-app -f`
- Verify health endpoint: `docker exec espacio-app wget -O- http://localhost:3000/api/health`

### 404 Not Found
- Verify Traefik labels in docker-compose.yml
- Check Dokploy domain configuration
- Ensure domain DNS is pointed correctly

### Database Connection Issues
- Check DATABASE_URL in environment
- Verify postgres container is healthy: `docker ps`
- Test connection: `docker exec espacio-app npx prisma db push --preview-feature`

### MinIO Connection Issues
- Check MinIO is healthy: `docker exec espacio-minio curl http://localhost:9000/minio/health/live`
- Verify MINIO_ENDPOINT is set to `minio` (not localhost)

## 🔐 Security Notes

1. **Change default passwords** in production:
   - POSTGRES_PASSWORD
   - MINIO_ROOT_PASSWORD
   - REDIS_PASSWORD
   - NEXTAUTH_SECRET

2. **Use secrets management** in production (Dokploy secrets or Docker secrets)

3. **Enable SSL** for all external connections

4. **Regular backups** of volumes:
   - postgres_data
   - minio_data
   - redis_data

## 📦 Data Persistence

All data is stored in named Docker volumes:
- `postgres_data` - Database
- `minio_data` - Object storage
- `redis_data` - Cache

To backup:
```bash
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .
```

## 🔄 Updates

To update the application:

```bash
# Pull changes
git pull

# Rebuild and restart
docker-compose up -d --build app

# Check logs
docker logs espacio-app -f
```

## 🛑 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ DELETES ALL DATA)
docker-compose down -v
```

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify all services are healthy: `docker-compose ps`
3. Check Dokploy logs in the UI
4. Verify domain DNS settings