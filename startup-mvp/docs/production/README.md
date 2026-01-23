# Production Module - Quick Reference

## Overview

The Production module manages manufacturing and production processes, including Bill of Materials (BOM) definitions.

## Modules

### Bill of Materials (BOM)
- **Path**: `/dashboard/production/boms`
- **Permission**: `production.boms`
- **Purpose**: Define recipes for finished goods production

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

### Editing a BOM
1. Navigate to BOM list
2. Click "Edit" on desired BOM
3. Modify fields as needed
4. Save changes

## Key Concepts

### BOM Structure
- **Finished Good**: The item being produced
- **Quantity Per Unit**: How many finished goods are produced (e.g., 1.0 for full, 0.5 for half)
- **Raw Materials**: Items needed to produce the finished good
- **Quantity Required**: Amount of raw material needed per unit

### Code Format
BOM codes are auto-generated: `BOM-YYYY-NNNN`
- Example: `BOM-2026-0001`

## Permissions

Required permissions for BOM operations:
- `production.boms.create` - Create new BOMs
- `production.boms.view` - View BOMs
- `production.boms.edit` - Edit BOMs
- `production.boms.move-to-trash` - Soft delete
- `production.boms.delete-permanently` - Permanent delete

## Related Documentation

- [BOM Module Documentation](./BOM_MODULE.md) - Complete technical documentation
- [Item Master Documentation](../master/ITEM_MASTER.md) - Item definitions
- [Inventory Module Documentation](../inventory/INVENTORY_MODULE.md) - Stock management
