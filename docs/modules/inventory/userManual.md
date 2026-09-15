# Inventory User Manual

## Overview
The Inventory module allows you to track the real-time quantity and value of your stock across multiple warehouses. It acts as the central hub for all item movements from Purchases, Sales, and Production.

## 1. Viewing Stock
Navigate to **Dashboard > Inventory > Stock** to see a list of all items.

### Key Metrics
*   **Total Quantity**: The physical count of items currently in the warehouse.
*   **Reserved**: Quantity locked for pending Production Orders (cannot be sold or used elsewhere).
*   **Available**: `Total - Reserved`. This is the quantity you can actually use or sell.

### Searching & Filtering
*   **Search**: Use the search bar to find items by Name or Code.
*   **Filters**: Use the dropdowns to filter stock by specific **Warehouse** or **Item Category**.

## 2. Managing Stock

### Automatic Updates
You rarely need to update stock manually. The system handles it automatically:
*   **Purchases**: When you "Receive" goods, stock increases.
*   **Sales**: When you deliver goods (Invoice/Challan), stock decreases.
*   **Production**: Raw materials decrease, Finished goods increase.

### Manual Adjustments
Use the **Adjust Stock** feature for corrections (e.g., damaged goods, theft, counting errors).

1.  Click **Adjust Stock** (or "Add Adjustment").
2.  Select the **Item** and **Warehouse**.
3.  Enter the **Quantity**:
    *   **Positive (+)**: To add stock (e.g., found extra items).
    *   **Negative (-)**: To remove stock (e.g., spoilage).
4.  Enter a **Reason/Note** (Required for audit trails).
5.  Saving will immediately update the stock quantity and create a Ledger entry.

## 3. Stock Ledger (Audit Trail)
The Stock Ledger is a permanent history of every single item movement.

*   **IN**: Stock entered the warehouse (Purchase, Production Output, Return).
*   **OUT**: Stock left the warehouse (Sale, Production Input, Damage).
*   **ADJUSTMENT**: Manual corrections.

Use the Ledger to answer questions like:
*   *"When did we receive this item?"*
*   *"Who adjusted this stock last week?"*
*   *"Why is the count different from what I expected?"*
