# Inventory Module Documentation

## 1. Overview
The Inventory Module is the central hub for tracking physical goods. It is designed to be "passive" in that most changes come from other modules (Purchase, Sales, Production), but it provides the core validation and "state of truth" for stock levels across multiple warehouses.

## 2. Core Entities

### 2.1 Items
The base unit of inventory.
*   **Types**: 
    *   **Raw Material**: Used in production (e.g., Flour, Sugar).
    *   **Finished Good**: Produced and sold (e.g., Cake).
    *   **Retail**: Bought and sold directly.
    *   **Service/Non-Inventory**: Not tracked in stock.
*   **Properties**: Cost Price, Selling Price, Unit of Measurement (UOM).

### 2.2 Warehouses
Physical locations where stock is stored.
*   Multi-warehouse support allows tracking stock in "Main Store", "Production Floor", "Showroom", etc.

### 2.3 Stock
A many-to-many relationship between `Item` and `Warehouse`.
*   **Quantity**: Current available stock.
*   **Reserved**: Stock committed to orders but not yet shipped (future feature).
*   **Value**: Tracks Moving Average Cost (MAC) if implemented, otherwise uses Item Cost Price.

## 3. Stock Ledger
The `StockLedger` table is the immutable audit trail for every inventory movement.

| Transaction Type | Source Module | Effect |
| :--- | :--- | :--- |
| **IN** | Purchase | Increases stock (Goods Received) |
| **OUT** | Sales | Decreases stock (Delivery) |
| **IN** | Production (Output) | Increases stock (Finished Goods) |
| **OUT** | Production (Input) | Decreases stock (Raw Materials) |
| **ADJUSTMENT** | Audit | Correction (Damage/Found) |
| **TRANSFER** | Logistics | Moves stock W1 -> W2 |

## 4. Integration Logic

### 4.1 Purchase Integration
*   When a Purchase is `RECEIVED`, stock increases in the target warehouse.
*   Validation: None (you can always buy more).

### 4.2 Production Integration
*   **Raw Materials**: Stock decreases upon `COMPLETE`.
*   **Finished Goods**: Stock increases upon `COMPLETE`.
*   **Validation**: Prevents completion if Raw Materials are insufficient.

### 4.3 Sales Integration (Planned)
*   When a Sale is `DELIVERED`, stock decreases.
*   Validation: Prevents sale if stock is insufficient.

## 5. API / Actions
*   `updateStockOnPurchase`: Handles Purchase Receives.
*   `validateStockAvailability`: Checks if a list of items exists in a warehouse.
*   `adjustStock`: Manual corrections by authorized staff.

## 6. Reporting
*   **Stock Balance**: Current qty per item per warehouse.
*   **Stock Ledger Report**: History of movements for a specific item.
*   **Low Stock Alerts**: Items below minimum threshold (future).
