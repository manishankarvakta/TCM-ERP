# Backup System Deployment Guide

## Prerequisites

### Required Software

1. **Node.js** v18+ (for Next.js application)
2. **PostgreSQL** v14+ (database)
3. **PostgreSQL Client Tools** (`pg_dump`, `pg_restore`)
4. **Sufficient Disk Space** (at least 2x your data size)

### System Requirements

- **Minimum RAM**: 2GB (4GB+ recommended for production)
- **Disk Space**: Varies based on backup size and retention policy
- **Network**: Stable connection to database

## Installation

### 1. Install Dependencies

The backup system dependencies should already be installed if you followed the main setup. If not:

```bash
cd startup-mvp
npm install archiver adm-zip pg @types/archiver @types/pg --legacy-peer-deps
```

### 2. Install PostgreSQL Client Tools

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

#### macOS

```bash
brew install postgresql
```

#### Docker

If running in Docker, add to your Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y postgresql-client
```

### 3. Verify Installation

```bash
# Check pg_dump is available
pg_dump --version

# Check pg_restore is available
pg_restore --version
```

## Configuration

### Environment Variables

Add the following to your `.env` or `.env.local` file:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Alternative: Individual database variables
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=startup_mvp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword

# Storage Configuration
UPLOAD_DIR=/app/uploads

# Backup Configuration (Optional)
BACKUP_ROOT_DIR=/path/to/backups
BACKUP_TEMP_DIR=/tmp/backups
```

### Directory Setup

Create the necessary directories:

```bash
# Create backup directories
mkdir -p backups/database
mkdir -p backups/files
mkdir -p backups/full

# Create temp directory
mkdir -p tmp/backups

# Set appropriate permissions
chmod 755 backups
chmod 755 tmp/backups
```

### PostgreSQL User Permissions

Ensure the PostgreSQL user has necessary permissions:

```sql
-- Connect as superuser
psql -U postgres

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE startup_mvp TO your_user;

-- For pg_dump to work, user needs SELECT on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO your_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO your_user;
```


## Deployment Scenarios

### Development Environment

Minimal setup for local development:

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Run application
npm run dev

# 3. Access backup page
# Navigate to http://localhost:3000/dashboard/settings (Backup tab)
```

### Production Environment

#### Docker Compose Setup

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - UPLOAD_DIR=/app/uploads
      - BACKUP_ROOT_DIR=/app/backups
    volumes:
      - backup-data:/app/backups
      - temp-data:/tmp/backups
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=startup_mvp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data


volumes:
  backup-data:
  temp-data:
  postgres-data:
```

#### Kubernetes Deployment

##### Persistent Volume for Backups

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

##### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: espacio-app
spec:
  replicas: 1  # Important: Only 1 replica for backup operations
  template:
    spec:
      containers:
      - name: app
        image: espacio-mvp:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: BACKUP_ROOT_DIR
          value: "/backups"
        volumeMounts:
        - name: backup-storage
          mountPath: /backups
        - name: temp-storage
          mountPath: /tmp/backups
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-storage
      - name: temp-storage
        emptyDir: {}
```

### Cloud Deployments

#### Vercel

**Note**: Vercel's serverless environment has limitations for backup operations:

- ⚠️ File system is read-only except `/tmp`
- ⚠️ 10-second timeout on Hobby plan, 60s on Pro
- ⚠️ Backup operations may timeout

**Recommendation**: Use a separate long-running server for backups or:

1. Deploy backup API on a different platform (Railway, Render)
2. Use Vercel for main app, external service for backups
3. Configure `BACKUP_ROOT_DIR` to cloud storage (S3)

#### AWS (EC2 or ECS)

1. **EBS Volume**: Attach EBS volume for backup storage
2. **S3 Integration**: Optionally sync backups to S3
3. **IAM Roles**: Configure appropriate IAM roles for S3 access

```bash
# Example: Sync backups to S3
aws s3 sync /app/backups s3://my-bucket/backups/ --delete
```

#### Google Cloud (Compute Engine or Cloud Run)

1. **Persistent Disk**: Attach persistent disk for backups
2. **Cloud Storage**: Sync to Google Cloud Storage
3. **Service Account**: Configure service account with storage permissions

## Automated Backups

### Using Cron (Linux/macOS)

Create a backup script:

```bash
#!/bin/bash
# /opt/scripts/backup.sh

curl -X POST http://localhost:3000/api/backup/create \
  -H "Content-Type: application/json" \
  -d '{"type":"full"}' \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Cleanup old backups (keep last 30 days)
find /app/backups -name "*.zip" -mtime +30 -delete
```

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Using Node.js Scheduler

Create a scheduled task in your application:

```typescript
// lib/schedulers/backup-scheduler.ts
import { CronJob } from 'cron';
import { createFullBackup } from '@/lib/backup/create';

export function startBackupScheduler() {
  // Run daily at 2 AM
  const job = new CronJob('0 2 * * *', async () => {
    try {
      console.log('[Scheduler] Starting automated backup...');
      const metadata = await createFullBackup({
        description: 'Automated daily backup',
      });
      console.log(`[Scheduler] Backup created: ${metadata.id}`);
    } catch (error) {
      console.error('[Scheduler] Backup failed:', error);
    }
  });

  job.start();
  console.log('[Scheduler] Backup scheduler started');
}
```

Install cron package:

```bash
npm install cron @types/cron
```

Initialize in your app:

```typescript
// app/layout.tsx or server startup
import { startBackupScheduler } from '@/lib/schedulers/backup-scheduler';

// In a server component or API route
startBackupScheduler();
```

## Monitoring

### Health Checks

Create a health check endpoint:

```typescript
// app/api/backup/health/route.ts
import { NextResponse } from 'next/server';
import { listAllBackups } from '@/lib/backup/list';
import { getAvailableDiskSpace } from '@/lib/backup/utils';

export async function GET() {
  try {
    const backups = await listAllBackups();
    const diskSpace = await getAvailableDiskSpace();
    
    const lastBackup = backups[0];
    const hoursSinceLastBackup = lastBackup
      ? (Date.now() - new Date(lastBackup.metadata.timestamp).getTime()) / (1000 * 60 * 60)
      : Infinity;

    const healthy = hoursSinceLastBackup < 48 && diskSpace > 1024 * 1024 * 1024; // 1GB

    return NextResponse.json({
      healthy,
      backupCount: backups.length,
      lastBackup: lastBackup?.metadata.id,
      lastBackupAge: `${hoursSinceLastBackup.toFixed(1)} hours ago`,
      diskSpaceGB: (diskSpace / (1024 * 1024 * 1024)).toFixed(2),
    });
  } catch (error) {
    return NextResponse.json({ healthy: false, error: String(error) }, { status: 500 });
  }
}
```

### Alerting

Set up alerts for:

1. **Backup Failures**: Alert if backup fails
2. **No Recent Backups**: Alert if > 48 hours since last backup
3. **Low Disk Space**: Alert if < 10% free space
4. **Corrupted Backups**: Alert if validation fails

Example with a simple webhook:

```typescript
async function sendAlert(message: string) {
  await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}

// Use in backup creation
try {
  await createFullBackup();
} catch (error) {
  await sendAlert(`🚨 Backup failed: ${error.message}`);
  throw error;
}
```

## Backup Retention Policy

### Recommended Strategy

- **Hourly**: Last 24 hours (if high-frequency updates)
- **Daily**: Last 7 days
- **Weekly**: Last 4 weeks
- **Monthly**: Last 12 months

### Implementation

```typescript
// lib/backup/retention.ts
import { listAllBackups, deleteBackup } from './list';

export async function applyRetentionPolicy() {
  const backups = await listAllBackups();
  const now = Date.now();

  for (const backup of backups) {
    const age = now - new Date(backup.metadata.timestamp).getTime();
    const days = age / (1000 * 60 * 60 * 24);

    // Delete backups older than 30 days
    if (days > 30) {
      await deleteBackup(backup.metadata.id);
      console.log(`Deleted old backup: ${backup.metadata.id}`);
    }
  }
}
```

Run retention policy daily:

```bash
# Add to crontab
0 3 * * * node -e "require('./lib/backup/retention').applyRetentionPolicy()"
```

## Disaster Recovery

### Backup Strategy

1. **On-site Backups**: Local backups for quick restore
2. **Off-site Backups**: Cloud storage for disaster recovery
3. **Multiple Copies**: Follow 3-2-1 rule (3 copies, 2 different media, 1 off-site)

### Recovery Procedures

#### Complete System Restore

1. **Setup new infrastructure**
2. **Install application and dependencies**
3. **Download latest full backup**
4. **Upload backup to new system**
5. **Initiate restore via UI or API**
6. **Verify data integrity**
7. **Resume operations**

#### Partial Restore (Database Only)

```bash
# Download database backup
curl -o backup.zip http://your-app.com/api/backup/backup-20240101-120000/download

# Extract database.dump
unzip backup.zip database.dump

# Restore manually
pg_restore -h localhost -U postgres -d startup_mvp database.dump
```

## Security

### Access Control

Implement authentication and authorization for backup endpoints:

```typescript
// middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/backup')) {
    const token = await getToken({ req: request });
    
    if (!token || token.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
}
```

### Network Security

- Use HTTPS for all API requests
- Restrict backup endpoints to admin users only
- Use VPN or private network for database access
- Enable firewall rules to limit access

### Backup Encryption (Future Enhancement)

Currently, backups are not encrypted. For sensitive data, consider:

1. Encrypting backup files with GPG
2. Using encrypted storage volumes
3. Implementing application-level encryption

## Troubleshooting

### Common Deployment Issues

#### Issue: "Permission denied" when creating backups

**Solution**:
```bash
# Ensure directories have correct permissions
chmod -R 755 /path/to/backups
chown -R app-user:app-group /path/to/backups
```

#### Issue: pg_dump not found in PATH

**Solution**:
```bash
# Find pg_dump location
which pg_dump

# Add to PATH in your environment or Dockerfile
ENV PATH="/usr/lib/postgresql/15/bin:${PATH}"
```

#### Issue: Out of memory during backup

**Solution**:
- Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
- Use streaming properly (already implemented)
- Reduce concurrent operations

#### Issue: Timeout during large restores

**Solution**:
- Increase timeout in reverse proxy (Nginx, CloudFlare)
- Implement chunked restore for very large files
- Process restore in background (already implemented)

## Performance Tuning

### Optimize Backup Speed

1. **Compression Level**: Adjust in `lib/backup/config.ts`
   - Level 1-3: Faster, larger files
   - Level 6 (default): Balanced
   - Level 9: Slower, smaller files

2. **Parallel Processing**: For multiple files
3. **Disk Performance**: Use SSD storage for faster I/O

### Optimize Restore Speed

1. **Skip Verification**: Only for trusted backups
2. **Fast Storage**: Use high-performance disks
3. **Database Indexes**: Restore indexes after data

## Monitoring Checklist

- [ ] Backups running successfully
- [ ] No recent backup failures
- [ ] Disk space sufficient (>20% free)
- [ ] Backup size trends normal
- [ ] Test restore successful this month
- [ ] Off-site copy up to date
- [ ] Alerts configured and working
- [ ] Access logs reviewed

## Support

For issues or questions:

1. Check [Backup System Documentation](./BACKUP_SYSTEM.md)
2. Review application logs
3. Check GitHub issues
4. Contact system administrator

## Version History

- **v1.0** (Current): Initial release with full backup/restore functionality

