# PRISMA SAFE CLEAN PLAN

**Target**: Remove deprecated models and clean up ghost module data.
**Status**: 🟡 PLANNING (No changes executed yet)

---

## 1. Identified Deprecated Assets

### Models
| Model | Status | Usage Check | Recommendation |
| :--- | :--- | :--- | :--- |
| **`ModuleOperation`** | 🔴 **DEPRECATED** | No references in `app` or `lib`. Not seeded. | **SAFE TO DELETE** |

### Fields / Data (Ghost Modules)
| Model | Field | Issue | Recommendation |
| :--- | :--- | :--- | :--- |
| **`UserPermission`** | `module` | Rows with `module = 'analytics'` or `'reports'` | **DELETE ROWS** |
| **`PermissionTemplate`** | `permissions` (JSON) | JSON keys `analytics` and `reports` | **UPDATE JSON** |
| **`User`** | `permissions` (JSON) | JSON keys `analytics` and `reports` | **UPDATE JSON** |

---

## 2. Risk Assessment

### `ModuleOperation` (Model)
*   **Dependency Check**: 🟢 PASSED. No code references found.
*   **Foreign Keys**: None active.
*   **Data Loss**: Low. This table appears to be an unused architectural artifact superseded by `PermissionTemplate`.
*   **Migration Impact**: Minimal. `DROP TABLE`.

### Permissions Data (Analytics / Reports)
*   **Dependency Check**: 🟢 PASSED. Code references soft-deleted.
*   **Data Loss**: Intentional. These modules are ghost modules (no features), so their permissions are meaningless.
*   **Risk**: modifying JSON fields in `PermissionTemplate` requires careful specific query or script to avoid corrupting other permissions.

---

## 3. Safe Migration Strategy

We will follow a 3-step **SAFE** approach.

### STEP 1: Mark & Verify (Current State)
*   [x] **Code Isolation**: Comments added to `permissions.ts` and sidebar.
*   [ ] **Database Audit**: Verify row counts for `ModuleOperation` (Expect 0 or stale data).

### STEP 2: Deploy & Clean (The Plan)
*   **Migration A (Schema)**: Remove `ModuleOperation` model from `schema.prisma` and run migration to drop table.
*   **Migration B (Data)**: Execute SQL to clean up permissions.

#### SQL for Data Cleanup (Draft)
```sql
-- 1. Delete UserPermissions for ghost modules
DELETE FROM "UserPermission" 
WHERE module IN ('analytics', 'reports');

-- 2. Clean PermissionTemplates (Postgres JSONB example)
-- Note: Requires robust JSON manipulation or a script-based approach
-- Alternative: Re-seed permissions using the updated seed script (Recommended)
```

### STEP 3: Observation
*   Monitor `UserLog` for any permission errors.
*   Check Admin > Settings > Permissions page for loading errors.

---

## 4. Execution Plan (Next Steps)

1.  **Backup Database**: `pg_dump` (User responsibility).
2.  **Schema Update**: Delete `model ModuleOperation` from `prisma/schema.prisma`.
3.  **Generate Migration**: `npx prisma migrate dev --name drop_module_operation`.
4.  **Re-Seed Permissions**: Run `npm run seed:permissions` to overwrite stale JSON templates with clean ones (Safest way to fix JSON).

---

> **⚠️ WARNING**: Do not proceed without a database backup.
