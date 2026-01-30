# Inventory Module - User Manual

## Introduction
The Inventory Module helps you track "what you have" and "where you have it." It works automatically with Purchase and Production to verify stock levels in real-time.

## 1. Understanding Stock
Stock is tracked by **Item** and **Warehouse**.
*   **Item**: The product (e.g., "Cotton Fabric").
*   **Warehouse**: The location (e.g., "Main Warehouse").
*   **Quantity**: The amount currently physically present.

## 2. Viewing Stock
To check your inventory:
1.  Navigate to **Inventory > Stock**.
2.  You will see a list of all items and their global available quantity.
3.  Click on an Item to see the **breakdown by Warehouse**.
    *   *Example*: Total 100 units (60 in Main, 40 in Factory).

## 3. Stock History (Ledger)
To see why stock changed:
1.  Navigate to **Inventory > Stock Ledger**.
2.  This page shows every transaction:
    *   **IN**: Stock added (Purchase, Production Output).
    *   **OUT**: Stock removed (Sales, Production Input).
    *   **TRANSFER**: Stock moved between warehouses.

## 4. Manual Adjustments
Sometimes physical stock doesn't match the system (damage, theft, or data entry errors).
1.  Navigate to **Inventory > Adjustments**.
2.  Click **New Adjustment**.
3.  **Type**:
    *   **Increase**: Found extra stock.
    *   **Decrease**: Lost/Damaged stock.
4.  **Item & Warehouse**: Select what and where.
5.  **Quantity**: The amount to add or remove.
6.  **Reason**: Mandatory note (e.g., "Water damage").
7.  Click **Save**. *This will also create an accounting journal if configured.*

## 5. Transfers
To move items between locations:
1.  Navigate to **Inventory > Transfers**.
2.  Click **New Transfer**.
3.  **Source**: Where stock is coming FROM.
4.  **Destination**: Where stock is going TO.
5.  **Items**: Add items and quantities.
6.  Click **Transfer**.
    *   *Note*: You cannot transfer more than what exists in the Source warehouse.
