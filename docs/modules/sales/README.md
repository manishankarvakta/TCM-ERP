# Sales Module Documentation

This directory contains development documentation for the Sales module.

## Quick Reference

### Module Overview
The Sales module manages sales orders to clients, integrates with inventory for stock deduction, and creates accounting vouchers for financial transactions including Accounts Receivable, Sales Revenue, and COGS.

### Key Routes
- **List**: `/dashboard/sales`
- **Add**: `/dashboard/sales/add`
- **View**: `/dashboard/sales/[id]/view`
- **Edit**: `/dashboard/sales/[id]/edit`
- **POS**: `/dashboard/sales/pos` (placeholder)

### Permission Key
`sales.sales`

### Main Features
- Sales order management (CRUD)
- Client integration with quick client creation
- Warehouse assignment
- Status workflow (DRAFT → COMPLETED → CANCELLED)
- Auto-generated sale numbers
- Inventory integration (automatic stock deduction)
- Accounting integration (voucher creation)
- COGS calculation for finished goods
- Tax calculation (15% VAT with auto-toggle)

## Documentation Files

### [SALES_MODULE.md](./SALES_MODULE.md)
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

### Creating a Sale

```typescript
import { createSale } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";

const result = await createSale({
  clientId: "client-id",
  warehouseId: "warehouse-id",
  date: new Date(),
  status: "DRAFT",
  items: [
    {
      itemId: "item-id", // Must be READY_PRODUCT or RETAIL
      description: "Item description",
      quantity: 2,
      unitPrice: 100,
      amount: 200,
    },
  ],
});
```

### Fetching Sales

```typescript
import { getSales } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";

const result = await getSales(1, 10, "search-term", "all");
if (result.success) {
  // Use result.sales and result.pagination
}
```

### Completing a Sale

When a sale is completed:
1. Stock is validated for availability
2. Stock is deducted via `updateStockOnSale()`
3. Accounting voucher is created:
   - Debit: Accounts Receivable
   - Credit: Sales Revenue
   - For FG items: Debit COGS, Credit FG Inventory
4. Voucher is posted automatically
5. Sale status changes to COMPLETED

```typescript
import { completeSale } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";

const result = await completeSale("sale-id");
if (result.success) {
  // Sale completed, stock deducted, accounting entries created
}
```

## Integration Points

### Inventory
- **Function**: `updateStockOnSale(saleId, warehouseId, items)`
- **Trigger**: When sale status = COMPLETED
- **Updates**: Stock quantities (decrements) and creates ledger entries

### Accounting
- **Functions**: `createVoucher()`, `postVoucher()`, `findControlAccount()`
- **Trigger**: When sale status = COMPLETED
- **Creates**: SALES type voucher with:
  - AR (Debit) and Sales Revenue (Credit)
  - COGS (Debit) and FG Inventory (Credit) for finished goods

## Related Modules

- **Inventory**: Stock deduction on sale completion
- **Accounting**: Voucher creation for financial transactions
- **Clients**: Client information and management
- **Warehouses**: Warehouse assignment and stock location
- **Items**: Item master data and sales prices (FG and RETAIL only)

## Support

For issues or questions:
1. Check [Troubleshooting](./SALES_MODULE.md#troubleshooting) section
2. Review server logs for error messages
3. Verify permissions and database constraints
4. Check integration module configurations
5. Review accounting setup (control accounts)
