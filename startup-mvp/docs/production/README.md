# Production Module - Quick Reference

## Overview

The Production module manages manufacturing and production processes, including Bill of Materials (BOM) definitions and Production Orders.

## Modules

### Bill of Materials (BOM)
- **Path**: `/dashboard/production/boms`
- **Permission**: `production.boms`
- **Purpose**: Define recipes for finished goods production

### Production Orders
- **Path**: `/dashboard/production/orders`
- **Permission**: `production.orders`
- **Purpose**: Manage production orders and track manufacturing

## Quick Start

### Viewing BOMs
1. Navigate to `/dashboard/production/boms`
2. Use search and filters to find specific BOMs
3. Click on a BOM to view details

### Creating a BOM
1. Click "Create BOM" button
2. Select finished good item
3. Enter quantity per unit production
4. Add raw materials with quantities
5. Save

### Creating a Production Order
1. Navigate to `/dashboard/production/orders`
2. Click "Create Production Order" button
3. Select BOM
4. Select warehouse
5. Enter production quantity
6. Review raw materials and stock availability
7. Save

### Completing Production
1. Navigate to production order detail page
2. Click "Start" to begin production (PLANNED → IN_PROGRESS)
3. Click "Complete" when production is finished (IN_PROGRESS → COMPLETED)
4. Stock is automatically updated (raw materials deducted, finished goods added)

## Key Concepts

### BOM Structure
- **Ready Product**: The item being produced
- **Quantity Per Unit**: How many finished goods are produced (e.g., 1.0 for full, 0.5 for half)
- **Raw Materials**: Items needed to produce the finished good
- **Quantity Required**: Amount of raw material needed per unit

### Production Order Workflow
1. **PLANNED**: Order created, not yet started
2. **IN_PROGRESS**: Production has started
3. **COMPLETED**: Production finished, stock updated
4. **CANCELLED**: Order cancelled

### Code Formats
- BOM codes: `BOM-YYYY-NNNN` (e.g., `BOM-2026-0001`)
- Production order codes: `PROD-YYYY-NNNN` (e.g., `PROD-2026-0001`)

### Stock Updates
When production is completed:
- Raw materials are deducted from stock (OUT transaction)
- Finished goods are added to stock (IN transaction)
- Stock ledger entries are created for audit trail

## Permissions

### BOM Permissions
- `production.boms.create` - Create new BOMs
- `production.boms.view` - View BOMs
- `production.boms.edit` - Edit BOMs
- `production.boms.move-to-trash` - Soft delete
- `production.boms.delete-permanently` - Permanent delete

### Production Order Permissions
- `production.orders.view` - View production orders
- `production.orders.create` - Create production orders
- `production.orders.edit` - Edit production orders (PLANNED only)
- `production.orders.start` - Start production (PLANNED → IN_PROGRESS)
- `production.orders.complete` - Complete production (IN_PROGRESS → COMPLETED)
- `production.orders.cancel` - Cancel production orders

## Related Documentation

- [BOM Module Documentation](./BOM_MODULE.md) - Complete BOM technical documentation
- [Production Module Documentation](./PRODUCTION_MODULE.md) - Complete Production Orders technical documentation
- [Item Master Documentation](../master/ITEM_MASTER.md) - Item definitions
- [Inventory Module Documentation](../inventory/INVENTORY_MODULE.md) - Stock management
