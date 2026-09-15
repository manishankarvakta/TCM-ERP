# Inventory Configuration Guide

## Overview
Before you can track stock, you must configure the Master Data. The Inventory module relies on these foundational records to know *what* to track and *where* to store it.

## 1. Warehouses
**Path**: `Dashboard > Master > Warehouses`

*   **Purpose**: Physical locations where stock is stored (e.g., "Main Warehouse", "Showroom", "Cold Storage").
*   **Requirement**: You must have at least one active warehouse to receive or sell goods.
*   **Default**: The system often uses the "Main Warehouse" as a default if no specific location is selected.

## 2. Units of Measure (UOM)
**Path**: `Dashboard > Master > Units`

*   **Purpose**: Defines how you count items.
*   **Examples**:
    *   **pcs**: Pieces
    *   **kg**: Kilograms
    *   **ltr**: Liters
    *   **box**: Boxes
*   **Best Practice**: Use standard abbreviations (kg, m, pcs) to keep reports clean.

## 3. Categories
**Path**: `Dashboard > Master > Categories`

*   **Purpose**: Groups similar items together for reporting and filtering.
*   **Examples**: "Raw Materials", "Packaging", "Finished Goods", "Beverages".
*   **Tip**: Create a hierarchy if needed (e.g., `Electronics > Mobile Phones`).

## 4. Item Setup (Critical!)
**Path**: `Dashboard > Master > Items`

When creating an Item, the following fields directly affect Inventory:

### A. Track Inventory?
*   **Enable (Checked)**: The system *will* count stock for this item. Use for physical goods (Rice, Phones, Tables).
*   **Disable (Unchecked)**: The system *will not* count stock. Use for services (Delivery Charge, Reparation Service, labor).

### B. Opening Stock
*   **Initial Count**: You can set the starting quantity when creating a new item.
*   **Initial Value**: You must provide the cost per unit for this opening stock to establish the initial asset value.

### C. Low Stock Threshold
*   **Alert Level**: Set a number (e.g., 10). When stock falls below this, the system will flag the item as "Low Stock" on the dashboard.
