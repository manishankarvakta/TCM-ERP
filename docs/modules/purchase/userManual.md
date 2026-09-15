# Purchase Module User Manual

## Introduction
The Purchase Module allows you to manage the procurement of goods from suppliers. It tracks the entire lifecycle of an order from the initial draft to final receipt, ensuring that inventory stock and accounting records are automatically updated.

## 1. Creating a New Purchase Order

1.  Navigate to **Dashboard > Purchases** in the sidebar.
2.  Click the **Add New** button in the top right corner.
3.  Fill in the required details:
    *   **Supplier**: Select the vendor you are buying from.
    *   **Warehouse**: **Important!** Choose the warehouse where these items will be physically received. Stock will be added here.
    *   **Date**: The date of the purchase order.
    *   **Items**: Add items using the search bar. You can add multiple rows.
        *   *Quantity*: How many units you are ordering.
        *   *Unit Price*: The cost per unit.
    *   **Financials**: Enter any Discounts or Taxes applicable to the total.
4.  Click **Create Purchase** to save. By default, new orders are saved as **DRAFT**.

## 2. Order Lifecycle & Statuses

The workflow consists of three main stages:

### Step 1: Draft
*   **Purpose**: Preparing the order. You can fully edit items, quantities, and prices.
*   **Action**: Once verified, open the purchase view page and click the blue **Approve Purchase** button.
*   **Status Change**: Updates status to **APPROVED**.

### Step 2: Approved
*   **Purpose**: The order is confirmed and sent to the supplier.
*   **Action**: When goods physically arrive at the warehouse, open the purchase view page and click the green **Receive Goods** button.
*   **Status Change**: Updates status to **RECEIVED**.

### Step 3: Received
*   **Purpose**: The transaction is complete.
*   **Automatic Effects**:
    *   **Inventory**: Stock levels for all items are *increased* in the selected Warehouse.
    *   **Accounting**: A journal voucher is created (Debiting Inventory, Crediting Accounts Payable).
*   **Restriction**: To maintain data accuracy, you **cannot edit or delete** a purchase once it is in the "Received" state.

## 3. Managing Purchases

### Editing an Order
*   You can edit orders that are in **DRAFT** or **APPROVED** status.
*   Open the order and click the **Edit** button (top right).
*   *Note*: The edit button will disappear once an order is **RECEIVED**.

### Deleting an Order
*   You can move orders to trash from the main list view.
*   **Draft/Approved** orders can be safely deleted.
*   **Received** orders cannot be directly deleted if they have already updated stock/accounts.

### Searching & Filtering
*   Use the search bar on the main Purchase List page to find orders by **Purchase Number**, **Supplier Name**, or **Email**.
