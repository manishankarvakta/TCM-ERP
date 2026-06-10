# Purchase Module Documentation

This directory contains development documentation for the Purchase module.

## Quick Reference

### Module Overview
The Purchase module manages purchase orders from suppliers, integrates with inventory for stock updates, and creates accounting vouchers for financial transactions.

### Key Routes
- **List**: `/dashboard/procurements/purchases`
- **Add**: `/dashboard/procurements/purchases/add`
- **View**: `/dashboard/procurements/purchases/[id]/view`
- **Edit**: `/dashboard/procurements/purchases/[id]/edit`

### Permission Key
`purchases.purchases`

### Main Features
- Purchase order management (CRUD)
- Supplier integration
- Warehouse assignment
- Status workflow (DRAFT → APPROVED → RECEIVED)
- Auto-generated purchase numbers
- Inventory integration (automatic stock updates)
- Accounting integration (voucher creation)
- Item-type based accounting entries

## Documentation Files

### [PURCHASE_MODULE.md](./PURCHASE_MODULE.md)
Comprehensive development documentation covering:
- Database schema
- Server actions API
- UI components
- Permissions
- Integration points
- Business logic
- Testing guidelines
- Troubleshooting

## Quick Start

### Creating a Purchase

```typescript
import { createPurchase } from "@/app/(dashboard)/dashboard/procurements/purchases/_actions/purchase.action";

const result = await createPurchase({
  supplierId: "supplier-id",
  warehouseId: "warehouse-id",
  date: new Date(),
  status: "DRAFT",
  items: [
    {
      itemId: "item-id",
      description: "Item description",
      quantity: 10,
      unitPrice: 100,
      amount: 1000,
    },
  ],
});
```

### Fetching Purchases

```typescript
import { getPurchases } from "@/app/(dashboard)/dashboard/procurements/purchases/_actions/purchase.action";

const result = await getPurchases(1, 10, "search-term", "all");
if (result.success) {
  // Use result.purchases and result.pagination
}
```

### Receiving a Purchase

When a purchase status is changed to `RECEIVED`:
1. Stock is automatically updated via `updateStockOnPurchase()`
2. Accounting voucher is created and posted
3. Stock ledger entries are created

## Integration Points

### Inventory
- **Function**: `updateStockOnPurchase(purchaseId, warehouseId)`
- **Trigger**: When purchase status = RECEIVED or PARTIALLY_RECEIVED
- **Updates**: Stock quantities and creates ledger entries

### Accounting
- **Functions**: `createVoucher()`, `postVoucher()`
- **Trigger**: When purchase status = RECEIVED
- **Creates**: PURCHASE type voucher with item-type based entries

## Related Modules

- **Inventory**: Stock updates on purchase receipt
- **Accounting**: Voucher creation for financial transactions
- **Suppliers**: Supplier information and management
- **Warehouses**: Warehouse assignment and stock location
- **Items**: Item master data and cost prices

## Support

For issues or questions:
1. Check [Troubleshooting](./PURCHASE_MODULE.md#troubleshooting) section
2. Review server logs for error messages
3. Verify permissions and database constraints
4. Check integration module configurations
