# Ferrari Fashion  ERP

A modern, full-stack Enterprise Resource Planning system for Ferrari Fashion  Biryani House, built with Next.js 15, Prisma, and PostgreSQL.

## 🚀 Quick Start

### 1. Installation
```bash
git clone <repository-url>
cd startup-mvp
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/Ferrari Fashion "
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
# File Storage Config (Local)
UPLOAD_DIR="/app/uploads"
# Redis Config
REDIS_URL="redis://localhost:6379"
```

### 3. Database Initialization
```bash
# Sync schema
npx prisma db push

# Generate client
npx prisma generate

# Seed initial data (Admin user, COA, Units, Categories)
npx tsx prisma/seed.ts

# Seed permissions
npx tsx prisma/seed-permissions.ts
```

### 4. Run Application
```bash
npm run dev
```

---

## 🛠 Features

- **Integrated Accounting**: Double-entry bookkeeping system with real-time financial reporting (P&L, Balance Sheet, Trial Balance).
- **Human Resource Management (HRM)**: Comprehensive employee management, attendance tracking (with biometric integration), leave applications, and automated payroll processing.
- **Inventory Management**: Multi-warehouse stock tracking with detailed ledgers and valuation.
- **Production (Kitchen)**: Bill of Materials (BOM) management and production order tracking.
- **Sales & POS**: Comprehensive sales management integrated with inventory and accounting.
- **Granular RBAC**: Highly detailed permission system with pre-defined templates for various roles.
- **Automated Backups**: Encrypted database and file backups with local persistence.

---

## 📖 Documentation

The project includes extensive documentation for developers and users:

- **[Final Developer Documentation](docs/FINAL_DEVELOPER_DOCUMENTATION.md)**: Architecture, Tech Stack, and Modular Design.
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Instructions for production deployment via Docker/Dokploy.
- **[Accounts System Guide](docs/ACCOUNTS_DEVELOPER_DOCUMENTATION.md)**: Deep dive into the accounting engine.
- **[User Permission System](docs/USER_PERMISSION_SYSTEM.md)**: Explanation of the RBAC and template structure.

---

## 🧪 Validation

Before any major deployment or change, run the automated validation script:
```bash
npx tsx scripts/pre-deployment-validation.ts
```

---

## 📄 License
© 2025 Ferrari Fashion  Biryani House. All rights reserved.
Developed by Techsoul.
