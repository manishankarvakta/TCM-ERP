# Prisma Schema Update Workflow

This guide explains the proper workflow for updating Prisma schema to avoid errors.

## When You Update Prisma Schema

Whenever you modify `prisma/schema.prisma`, you must follow these steps:

### 1. **Update the Schema File**
Edit `prisma/schema.prisma` with your changes (e.g., adding a new field, changing a type, etc.)

### 2. **Create a Migration (Development)**
```bash
# Create a new migration file
npx prisma migrate dev --name your_migration_name

# This will:
# - Create a migration file in prisma/migrations/
# - Apply the migration to your database
# - Regenerate Prisma Client automatically
```

**OR** if you just want to sync the schema without creating a migration (quick development):
```bash
# Push schema changes directly to database (no migration file)
npx prisma db push

# Then manually regenerate Prisma Client
npx prisma generate
```

### 3. **Regenerate Prisma Client**
```bash
# Always regenerate Prisma Client after schema changes
npx prisma generate
```

**Important:** If you're using Docker, you need to rebuild the container:
```bash
docker-compose down
docker-compose up -d --build
```

### 4. **Apply Migrations (Production)**
In production, use:
```bash
# Apply pending migrations without creating new ones
npx prisma migrate deploy
```

## Complete Workflow Example

### Scenario: Adding a new field to User model

1. **Edit `prisma/schema.prisma`:**
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  status        String    @default("active") // NEW FIELD
  // ... other fields
}
```

2. **Create and apply migration:**
```bash
npx prisma migrate dev --name add_user_status
```

3. **Verify migration:**
```bash
npx prisma migrate status
```

4. **If using Docker, rebuild:**
```bash
docker-compose down
docker-compose up -d --build
```

5. **Restart your dev server** (if running locally):
```bash
# Stop your Next.js dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Common Errors and Solutions

### Error: "Unknown argument `status`"
**Cause:** Prisma Client wasn't regenerated after schema change.

**Solution:**
```bash
# 1. Regenerate Prisma Client
npx prisma generate

# 2. If using Docker, rebuild
docker-compose down
docker-compose up -d --build

# 3. Restart your dev server
```

### Error: "The table does not exist"
**Cause:** Migration wasn't applied to the database.

**Solution:**
```bash
# Apply migrations
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

### Error: "Migration drift detected"
**Cause:** Database schema doesn't match migration history.

**Solution:**
```bash
# Option 1: Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Option 2: Mark migration as applied (if already in database)
npx prisma migrate resolve --applied migration_name

# Option 3: Create baseline migration
npx prisma migrate dev --create-only
npx prisma migrate resolve --applied migration_name
```

## Best Practices

1. **Always create migrations** for production deployments
2. **Never edit migration files** after they've been applied
3. **Test migrations** in development before deploying
4. **Backup database** before running migrations in production
5. **Regenerate Prisma Client** after every schema change
6. **Restart dev server** after regenerating Prisma Client

## Docker-Specific Notes

When using Docker:

1. **Schema changes require rebuild:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

2. **Migrations run automatically** on container startup (see `docker-compose.yml`)

3. **Prisma Client is generated** during Docker build (see `Dockerfile`)

4. **If you need to run migrations manually:**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

5. **To regenerate Prisma Client in container:**
   ```bash
   docker-compose exec app npx prisma generate
   ```

## Quick Reference

| Action | Command |
|--------|---------|
| Create migration | `npx prisma migrate dev --name migration_name` |
| Apply migrations | `npx prisma migrate deploy` |
| Push schema (dev only) | `npx prisma db push` |
| Generate Prisma Client | `npx prisma generate` |
| Check migration status | `npx prisma migrate status` |
| Reset database | `npx prisma migrate reset` |
| Format schema | `npx prisma format` |
| View database | `npx prisma studio` |

## Summary

**Every time you update `prisma/schema.prisma`:**

1. ✅ Create migration: `npx prisma migrate dev --name your_name`
2. ✅ Prisma Client auto-regenerates (or run `npx prisma generate`)
3. ✅ Restart dev server
4. ✅ If using Docker: Rebuild containers

**For production:**
1. ✅ Run: `npx prisma migrate deploy`
2. ✅ Ensure Prisma Client is regenerated in build process

