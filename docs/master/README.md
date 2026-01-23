# Master Data Modules - Development Documentation

**Last Updated**: January 2026  
**Version**: 1.0.0

---

## 📋 Overview

This directory contains comprehensive development documentation for all Master Data modules in the ERP system. Master Data modules are foundational data entities that support core business operations including inventory, production, sales, and accounting.

## 🎯 Master Data Modules

### ✅ Implemented Modules

1. **Item Master** (`/dashboard/master/items`)
   - Complete CRUD operations
   - Item types: Raw Material, Finished Good, Retail
   - Stock tracking integration
   - Auto-generated item codes
   - See [ITEM_MASTER.md](./ITEM_MASTER.md) for details

2. **Category Module** (`/dashboard/master/categories`)
   - Category management
   - Used for item classification
   - See [CATEGORY_MODULE.md](./CATEGORY_MODULE.md) for details

3. **Unit Module** (`/dashboard/master/units`)
   - Units of measurement management
   - Required for all items
   - See [UNIT_MODULE.md](./UNIT_MODULE.md) for details

4. **Warehouse Module** (`/dashboard/inventory/warehouses`)
   - Warehouse location management
   - Complete address information
   - Auto-generated warehouse codes
   - See [WAREHOUSE_MODULE.md](./WAREHOUSE_MODULE.md) for details

## 📚 Documentation Structure

```
docs/master/
├── README.md              # This file - Overview and navigation
├── ITEM_MASTER.md         # Item Master module documentation
├── CATEGORY_MODULE.md     # Category module documentation
├── UNIT_MODULE.md         # Unit module documentation
├── WAREHOUSE_MODULE.md    # Warehouse module documentation
├── ARCHITECTURE.md        # Architecture patterns and conventions
└── API_REFERENCE.md       # API reference for all modules
```

## 🏗️ Architecture Overview

All Master Data modules follow a consistent architecture pattern:

### File Structure
```
app/(dashboard)/dashboard/master/{module}/
├── page.tsx                    # List page (server component)
├── add/
│   └── page.tsx                # Add page (server component)
├── [id]/
│   ├── page.tsx                # Detail view (server component)
│   └── edit/
│       └── page.tsx            # Edit page (server component)
├── _actions/
│   └── {module}.action.tsx     # Server actions (CRUD)
└── _components/
    ├── {module}s.tsx           # List component (client)
    └── {module}Form.tsx        # Form component (client)
```

### Key Patterns

1. **Server Actions**: All data operations use Next.js Server Actions
2. **Permission Guards**: `PageGuard` component protects all routes
3. **Form Validation**: React Hook Form + Zod schemas
4. **Activity Logging**: All operations logged via `createUserLog`
5. **Notifications**: User notifications for create/update/delete
6. **Soft Delete**: `isTrash` flag for data retention

## 🔐 Permissions

Master Data modules use permission keys:
- `master.items` - Item Master permissions
- `master.categories` - Category permissions
- `master.units` - Unit permissions
- `inventory.warehouses` - Warehouse permissions (under Inventory module)

Each module supports standard operations:
- `view` - View/list items
- `create` - Create new items
- `edit` - Edit existing items
- `delete` - Delete items

## 🚀 Quick Start

### Adding a New Master Data Module

1. **Create Prisma Model**
   ```prisma
   model NewModule {
     id        String   @id @default(cuid())
     // ... fields
     status    String   @default("active")
     isTrash   Boolean  @default(false)
     createdBy String
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

2. **Register Permissions**
   - Add to `types/permissions.ts` in `NAVIGATION_STRUCTURE`
   - Register in `ModuleOperation` table via seed

3. **Create Server Actions**
   - Follow pattern in `ITEM_MASTER.md`
   - Include authentication, permission checks, logging

4. **Create UI Components**
   - List page with search/filter
   - Form component with validation
   - Detail view page

5. **Add Navigation**
   - Update `lib/navigation-builder.ts`
   - Add to sidebar menu

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed patterns.

## 📖 Module-Specific Documentation

- **[Item Master](./ITEM_MASTER.md)** - Complete guide to Item Master module
- **[Category Module](./CATEGORY_MODULE.md)** - Category management
- **[Unit Module](./UNIT_MODULE.md)** - Unit of measurement management
- **[Warehouse Module](./WAREHOUSE_MODULE.md)** - Warehouse location management
- **[Architecture](./ARCHITECTURE.md)** - Design patterns and conventions
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

## 🔗 Related Documentation

- [Master Data Implementation Tracker](../../MASTER_DATA_IMPLEMENTATION_TRACKER.md)
- [Codebase Analysis Report](../../CODEBASE_ANALYSIS_REPORT.md)
- [Food Production Domain Model](../../FOOD_PRODUCTION_DOMAIN_MODEL.md)

## 📝 Contributing

When adding or modifying Master Data modules:

1. Update this README if adding new modules
2. Create module-specific documentation
3. Update API reference
4. Follow existing patterns and conventions
5. Include permission checks and activity logging
6. Add proper error handling and validation

---

**Questions?** Refer to the module-specific documentation or the Architecture guide.
