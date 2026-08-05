# Startup MVP

A Next.js application with PostgreSQL, MinIO, and Redis support.

## 🚀 Deployment Options

Choose your deployment method:

- **🐳 Local Development**: Follow the instructions below for local Docker setup
- **☁️ Production Deployment (Dokploy)**: See [docs/DOKPLOY_DEPLOYMENT_GUIDE.md](./docs/DOKPLOY_DEPLOYMENT_GUIDE.md) for complete production deployment guide
- **🐋 Docker Production**: See [docs/DOCKER_SETUP.md](./docs/DOCKER_SETUP.md) for standalone Docker production setup

📚 **More Documentation**: See [docs/](./docs/) folder for all guides and documentation


---

## Diploy Branch: deploy
## Latest Reaslae: V1.0.1


## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm installed
- Git installed

## Setup Instructions

### Step 1: Start Docker Services

First, navigate to the project root and start the Docker containers:

```bash
cd /Users/manishankarvakta/Desktop/APPS/espacio
docker-compose up -d postgres minio redis
```

This will start:
- **PostgreSQL** on port `5432`
- **MinIO** on ports `9000` (API) and `9001` (Console)
- **Redis** on port `6379`

Wait for all services to be healthy (you can check with `docker ps`).

### Step 2: Create Environment Variables File

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

# MinIO Configuration (for local Docker)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=startup-mvp-files
MINIO_PUBLIC_URL=http://localhost:9000

# Email Configuration (optional - update with your SMTP credentials)
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=your-email-password-here
EMAIL_FROM=no-reply@techsoulbd.com
EMAIL_FROM_NAME=Startup MVP

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** Update the email configuration with your actual SMTP credentials if you plan to use email features.

### Step 3: Install Dependencies

Install the required npm packages:

```bash
npm install
```

### Step 4: Generate Prisma Client

Generate the Prisma Client from your schema:

```bash
npx prisma generate
```

### Step 5: Setup Database Schema

Sync your database schema with Prisma:

```bash
npx prisma db push
```

### Step 6: Seed Database with Sample Data

Seed the database with sample users and data:

```bash
npx prisma db seed
```

This will create the following test users:

#### Admin Account
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** `admin`

#### User Accounts
- **Email:** `john@example.com`
- **Password:** `password123`
- **Role:** `user`

- **Email:** `jane@example.com`
- **Password:** `password123`
- **Role:** `user`

### Step 7: Start the Application

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Access Points

- **Application:** http://localhost:3000
- **MinIO Console:** http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`
- **PostgreSQL:** localhost:5432
  - Database: `startup_mvp`
  - Username: `postgres`
  - Password: `postgres`

## Docker Commands

### Start all services
```bash
docker-compose up -d
```

### Stop all services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Check service status
```bash
docker ps
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL container is running: `docker ps | grep postgres`
- Check if the database exists: `docker exec -it startup-mvp-postgres psql -U postgres -l`

### MinIO Connection Issues
- Verify MinIO is running: `docker ps | grep minio`
- Access MinIO console at http://localhost:9001 to verify bucket creation

### Prisma Issues
- If migrations fail, try: `npx prisma db push` to sync schema
- Regenerate Prisma Client: `npx prisma generate`

## Project Structure

```
startup-mvp/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/              # Utility libraries
├── prisma/           # Prisma schema and migrations
├── public/           # Static assets
└── .env              # Environment variables (create this)
```

## Development

- The app uses Next.js 16 with the App Router
- Authentication is handled by NextAuth.js
- File storage uses MinIO (S3-compatible)
- Database uses PostgreSQL with Prisma ORM

## Webhook Integration Guide (Facebook Lead Ads & WhatsApp Cloud API)

This project integrates with Meta's Graph API and WhatsApp Cloud API to automatically capture leads in real-time.

### 1. Environment Variables Configuration

Add the following variables to your `.env` or `.env.docker` file inside the `startup-mvp` folder:

```env
# Meta / Facebook API Configuration
FB_APP_SECRET=your_facebook_app_secret
FB_VERIFY_TOKEN=your_facebook_webhook_verify_token
FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token

# WhatsApp Cloud API Configuration
WHATSAPP_VERIFY_TOKEN=your_whatsapp_webhook_verify_token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id
```

### 2. Configure Webhooks in Meta App Dashboard

1. Go to the [Meta App Dashboard](https://developers.facebook.com/).
2. Under **Products**, add **Webhooks** to your app.

#### Facebook Lead Ads
- **Callback URL**: `https://<your-domain>/api/webhooks/facebook`
- **Verify Token**: Must match the `FB_VERIFY_TOKEN` environment variable.
- Under **Page**, subscribe to the `leadgen` field.

#### WhatsApp Cloud API
- Under **Products**, add **WhatsApp** to your app.
- Under **WhatsApp** -> **Configuration**:
  - **Callback URL**: `https://<your-domain>/api/webhooks/whatsapp`
  - **Verify Token**: Must match the `WHATSAPP_VERIFY_TOKEN` environment variable.
  - Subscribe to the `messages` field to capture incoming messages and statuses.

### 3. Reliability and Idempotency
All incoming webhook requests are verified using HMAC SHA256 signature verification headers. Events are logged in the `WebhookEvent` table for audit trail purposes. To ensure high reliability and to prevent timeout errors from Meta:
1. Incoming webhook POSTs respond with status `200` immediately.
2. Webhook payloads are processed asynchronously by a background queue system powered by **BullMQ** and **Redis**.
3. Duplicate events/retries are discarded automatically using the unique idempotency keys in the `WebhookEvent` model.

## License

See LICENSE file for details.

