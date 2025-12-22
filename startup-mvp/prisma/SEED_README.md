# Database Seed Files

This directory contains seed files for populating the database with initial data.

## Structure

### Created Seed Files

1. **seed-users-categories-units.ts** - Seeds Users, Organizations, Categories, and Units
2. **seed-module-groups.ts** - Seeds ModuleGroup data (29 groups)
3. **seed-module-group-items-1.ts** - Seeds ModuleGroupItem data (Chunk 1/4 - 30 items)

### All Seed Files Created ✅

All seed files have been created and tested:
- `seed-module-group-items-1.ts` - 29 items ✅
- `seed-module-group-items-2.ts` - 42 items ✅
- `seed-module-group-items-3.ts` - 50 items ✅
- `seed-module-group-items-4.ts` - 24 items ✅

**Total: ~145 ModuleGroupItem records seeded**

## Running Seeds

### Option 1: Run Individual Seed Files
```bash
npx tsx prisma/seed-users-categories-units.ts
npx tsx prisma/seed-module-groups.ts
npx tsx prisma/seed-module-group-items-1.ts
# ... run remaining chunks when created
```

### Option 2: Run All via Prisma Seed
```bash
npx prisma db seed
```

**Note:** The main `seed.ts` file needs to be updated to import and run all chunk files once they are created.

## Data Source

All seed data is extracted from: `/Users/manishankarvakta/Desktop/postgresDB_2025-12-20.sql`
- ModuleGroup data: Lines 857-886
- ModuleGroupItem data: Lines 894-1039

## Helper Functions

All chunk files use these helper functions:
- `parseDate(dateStr)` - Converts SQL date format to JavaScript Date
- `parseDecimal(value)` - Converts string to Prisma.Decimal (handles NULL)
- `parseString(value)` - Handles NULL string values
- `parseInt(value)` - Converts string to integer (defaults to 0)

## Important Notes

1. **Dependencies**: ModuleGroupItems reference ModuleGroups via `moduleGroupId`. Ensure ModuleGroups are seeded first.
2. **NULL Handling**: The SQL dump uses `\N` to represent NULL values. All helper functions check for this.
3. **Decimal Precision**: All decimal fields use Prisma.Decimal for proper precision.
4. **Upsert Strategy**: All seeds use `upsert` to allow re-running without duplicates.

