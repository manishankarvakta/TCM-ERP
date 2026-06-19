# Ferrari Fashion  ERP

A modern Enterprise Resource Planning application built with Next.js 16, Prisma, PostgreSQL, and Redis.

## 🚀 Storage Architecture

This project uses a **Local Persistent Storage** system for files and media. Unlike cloud-based S3 or MinIO, this system stores files directly on the server's filesystem within a Docker volume, ensuring:
- **Simplicity**: No external storage services or complex bucket configurations required.
- **Performance**: High-speed local I/O for file operations.
- **Cost-Efficiency**: Uses existing server disk space without additional storage costs.
- **Reliability**: Files are persisted in the `./volumes/uploads` directory on the host.

## 🐳 Deployment Options

- **Local Development**: Follow the instructions below for local Docker setup.
- **Production Deployment (Dokploy)**: See [docs/DOKPLOY_DEPLOYMENT_GUIDE.md](./docs/DOKPLOY_DEPLOYMENT_GUIDE.md).
- **Docker Production**: See [docs/DOCKER_SETUP.md](./docs/DOCKER_SETUP.md).

---

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm installed
- Git installed

## Setup Instructions

### Step 1: Start Docker Services

Navigate to the project root and start the core infrastructure:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port `5432` (Data stored in `./volumes/postgres`)
- **Redis** on port `6379` (Data stored in `./volumes/redis`)
- **Next.js App** on port `3000` (Files stored in `./volumes/uploads`)

### Step 2: Create Environment Variables

Navigate to the `startup-mvp` directory and create a `.env` file:

```bash
cd startup-mvp
```

Create a `.env` file with the following content:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/startup_mvp?schema=public

# NextAuth
NEXTAUTH_SECRET=I5p97Jpv0Xr7Zz7Ay8W6+O2eLmBR6N2gllGrZO01Szo=
NEXTAUTH_URL=http://localhost:3000

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email Configuration (optional)
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=your-email-password-here
EMAIL_FROM=no-reply@techsoulbd.com
EMAIL_FROM_NAME=Ferrari Fashion  ERP

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Database Initialization

Sync your database schema and seed initial data:

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
```

#### Default Admin Account
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** `admin`

### Step 4: Run the Application

For local development with hot reloading:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
.
├── startup-mvp/       # Next.js Application Source
│   ├── app/           # App Router Routes & Actions
│   ├── components/    # UI Components
│   ├── lib/           # Storage & Database Utilities
│   └── prisma/        # Database Schema
├── volumes/           # Persistent Storage (Host Bound)
│   ├── postgres/      # Database Data
│   ├── redis/         # Cache Data
│   └── uploads/       # User Files & Media
└── docker-compose.yml # Container Orchestration
```

## Troubleshooting

### File Permissions
If file uploads fail with permission errors, ensure the `volumes/uploads` directory is writable:
```bash
docker exec -u root fferp-app chown -R nextjs:nodejs /app/uploads
```

### Database Connection
Ensure the PostgreSQL container is healthy before running Prisma commands:
```bash
docker ps | grep postgres
```

## License

See LICENSE file for details.
