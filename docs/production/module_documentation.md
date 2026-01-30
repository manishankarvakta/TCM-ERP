# Production Module Documentation

## 1. Overview
The Production Module manages the manufacturing process, transforming Raw Materials (RM) into Finished Goods (FG). It tracks the lifecycle of production orders, manages Bills of Materials (BOMs), and integrates seamlessly with Inventory and Accounting systems to ensure accurate stock and financial reporting.

## 2. Core Components

### 2.1 Bill of Materials (BOM)
A BOM is a "recipe" defining the raw materials required to produce a specific finished good.
*   **Structure**: One Finished Good (Item) -> Many Raw Materials (Items).
*   **Costing**: Automatically estimates production costs based on the current cost price of raw materials.
*   **Usage**: Used as a template for creating Production Orders.

### 2.2 Production Orders
Represents a specific instruction to produce a quantity of items.
*   **Lifecycle Stages**:
    1.  **PLANNED**: Order created, stock availability checked. No stock/accounting impact yet.
    2.  **IN_PROGRESS**: Production started. Raw material value moves to Work-In-Progress (WIP).
    3.  **COMPLETED**: Production finished. Raw materials deducted, Finished goods added. Value moves from WIP to FG Inventory.
    4.  **CANCELLED**: Order stopped. Reverses any WIP entries.

## 3. Technical Implementation

### 3.1 State Management (Redux)
To ensure high performance and instant calculation feedback, the **Create/Edit Production Order** form is powered by Redux.
*   **Slice**: `productionSlice.ts`
*   **Features**:
    *   **Synchronous Calculation**: As users type quantity, raw material requirements are calculated instantly on the client side without server round-trips.
    *   **BOM Caching**: Fetches BOM details once and stores them in state.
    *   **Form Persistence**: Manages ephemeral form state (quantity, warehouse, notes) before submission.

### 3.2 Server Actions
Core logic resides in `_actions/production.action.tsx`.
*   `createProductionOrder`: Validates inputs and creates the initial PLANNED order.
*   `startProductionOrder`: Transitions to IN_PROGRESS and creates WIP accounting entries.
*   `completeProductionOrder`: Transitions to COMPLETED, handles complex stock deductions/additions, and finalizes accounting.
*   `cancelProductionOrder`: Reverses generic accounting entries if needed.

## 4. Workflows & Integration

### 4.1 Stock Movement
Stock is tracked at the **Warehouse** level.
*   **Starting**: No physical stock change (financial only).
*   **Completing**:
    *   **Decrease**: Raw Materials (from the scheduled inputs).
    *   **Increase**: Finished Goods (the output item).
    *   **Ledger**: Creates `StockLedger` entries with reference type `PRODUCTION`.

### 4.2 Accounting Integration
The module generates automated Journal Vouchers based on **Accounting Operation Settings** (`getProductionAccounts`).

| Stage | Action | Debit | Credit | Amount |
| :--- | :--- | :--- | :--- | :--- |
| **Start** | Move to WIP | WIP Account | Raw Material Inventory | Total Cost of RM |
| **Complete** | FG Receipt | Finished Goods Inventory | WIP Account | Total Cost of RM |
| **Cancel** | Reversal | Raw Material Inventory | WIP Account | Total Cost of RM |

*   **Configurable Accounts**:
    *   `consumptionWipAccountId`: WIP Asset account.
    *   `consumptionRawMaterialInventoryId`: RM Inventory Asset account.
    *   `completionFinishedGoodsInventoryId`: FG Inventory Asset account.
    *   `completionWipAccountId`: WIP Asset account (usually same as consumption).

## 5. User Interface
*   **List View**: Filterable list of all orders with status badges.
*   **Create/Edit Form**: 
    *   Auto-calculates materials.
    *   Real-time stock validation (shows "Insufficient" warnings if warehouse lacks RM).
    *   Prevents submission of invalid quantities.

## 6. Security
*   **Permissions**: Protected by granular permissions (`production.orders.view`, `create`, `edit`, `start`, `complete`, `cancel`).
*   **Validation**: Server-side checks ensure status transitions follow the strict lifecycle (e.g., cannot complete a Planned order directly without starting it).
