# Inventory Module Documentation

This directory contains development documentation for the Inventory module.

## 📚 Documentation Files

- **[INVENTORY_MODULE.md](./INVENTORY_MODULE.md)** - Complete module documentation including:
  - Overview and features
  - Database schema
  - Server actions API reference
  - UI components
  - Permissions
  - Integration points
  - Transaction safety
  - Testing guidelines
  - Troubleshooting

## 🎯 Quick Start

### View Stock
Navigate to `/dashboard/inventory/stock` to view current stock levels.

### Adjust Stock
Navigate to `/dashboard/inventory/stock/adjust` to manually adjust stock quantities.

### View Stock Ledger
Navigate to `/dashboard/inventory/stock/ledger` to view complete transaction history.

## 🔑 Key Concepts

### Stock Model
Tracks current quantity and reserved quantity per item and warehouse.

### StockLedger Model
Maintains complete audit trail of all stock movements with transaction types:
- **IN** - Stock received (Purchase, Production output)
- **OUT** - Stock issued (Production input, Sales)
- **ADJUSTMENT** - Manual adjustment
- **PRODUCTION** - Production-related movement

### Automatic Updates
Stock is automatically updated when:
- Purchase order status changes to `RECEIVED` or `PARTIALLY_RECEIVED`

### Manual Adjustments
Stock can be manually adjusted with:
- Positive quantity (increase)
- Negative quantity (decrease)
- Complete audit trail in StockLedger

## 📖 Related Documentation

- [Item Master Module](../master/ITEM_MASTER.md)
- [Warehouse Module](../master/WAREHOUSE_MODULE.md)
- [Purchase Module](../ACCOUNTING_SALES_PROCUREMENT_ANALYSIS.md)
