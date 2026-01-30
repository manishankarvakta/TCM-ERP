# Production Module - User Manual

## Introduction
The Production Module allows you to manage your manufacturing process. You can define recipes (Bills of Materials) and track the production of items from start to finish, automatically updating your stock and accounts.

## 1. Bills of Materials (BOM)
A BOM is a recipe. It tells the system: "To make 1 unit of Item A, we need X amount of Item B and Y amount of Item C."

### Creating a BOM
1.  Navigate to **Production > Bill of Materials**.
2.  Click **Create BOM**.
3.  **BOM Name**: Give it a descriptive name (e.g., "Standard Chair Assembly").
4.  **Finished Good**: Select the item you are producing.
5.  **Quantity**: How many units this recipe produces (usually 1).
6.  **Raw Materials**: Add the items needed to make the finished good.
    *   Select the Raw Material item.
    *   Enter the quantity required.
7.  Click **Save**.

## 2. Production Orders
A Production Order is a command to the factory floor to produce goods.

### Step 1: Create an Order (Planning)
1.  Navigate to **Production > Production Orders**.
2.  Click **Create Order**.
3.  **Bill of Materials**: Select the recipe you want to use.
4.  **Warehouse**: Select where the raw materials will be taken from and where finished goods will be stored.
5.  **Quantity**: Enter how many units you want to produce.
    *   *Note*: The system will instantly show you the required raw materials and check if you have enough stock.
6.  Click **Create Production Order**.
    *   **Status**: `PLANNED`

### Step 2: Start Production
When actual work begins:
1.  Open the Production Order details.
2.  Click **Start Production**.
3.  **Status**: `IN_PROGRESS`
    *   *System Action*: The value of raw materials is moved to "Work-In-Progress" (WIP) in your accounts.

### Step 3: Complete Production
When the goods are finished:
1.  Open the Production Order details.
2.  Click **Complete Production**.
3.  **Status**: `COMPLETED`
    *   *System Action*:
        *   Raw materials are **removed** from stock.
        *   Finished goods are **added** to stock.
        *   WIP value is moved to Finished Goods Inventory in accounts.

### Step 4: Cancel Production
If you need to stop:
1.  Open the Production Order.
2.  Click **Cancel Order**.
3.  **Status**: `CANCELLED`
    *   *System Action*: Any financial value in WIP is reversed back to Raw Materials.

## 3. Stock Warnings
When creating an order, if you see a red **✗ Insufficient** warning next to a raw material, it means the selected warehouse does not have enough stock.
*   You can still create the order as a **Plan**.
*   You must purchase or transfer the missing items before you can **Complete** the order.
