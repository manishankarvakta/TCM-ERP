# Food Production Domain Model - Biryani House ERP
**Date**: January 23, 2026  
**Purpose**: Domain model design for food production system integrated with existing ERP

---

## 1. Entity List

### Core Production Entities

#### 1. Item (Master Data)
**Purpose**: Central item master that supports multiple item types
- **Type**: Master Data Entity
- **Item Types**: RAW_MATERIAL, FINISHED_GOOD, RETAIL
- **Key Fields**:
  - `id`, `code` (unique), `name`, `description`
  - `itemType` (enum: RAW_MATERIAL, FINISHED_GOOD, RETAIL)
  - `unitId` (reference to Unit)
  - `categoryId` (reference to Category - can be null)
  - `costPrice`, `unitPrice` (selling price)
  - `image`, `status`, `isTrash`
  - `createdBy`, `createdAt`, `updatedAt`
- **Business Rules**:
  - RAW_MATERIAL: Used in BOM, purchased from suppliers
  - FINISHED_GOOD: Produced via BOM, sold to customers
  - RETAIL: Direct sale items (beverages, sides) - not produced
  - Code generation: `RM-2026-0001` (Raw Material), `FG-2026-0001` (Finished Good), `RT-2026-0001` (Retail)

#### 2. Warehouse
**Purpose**: Physical storage locations
- **Type**: Master Data Entity
- **Key Fields**:
  - `id`, `code` (unique), `name`, `description`
  - `address`, `city`, `state`, `zip`, `country`
  - `warehouseType` (enum: MAIN, STORAGE, KITCHEN, RETAIL_OUTLET)
  - `status`, `isTrash`
  - `createdBy`, `createdAt`, `updatedAt`
- **Business Rules**:
  - MAIN: Primary warehouse for bulk storage
  - STORAGE: Secondary storage locations
  - KITCHEN: Production kitchen (raw materials → finished goods)
  - RETAIL_OUTLET: Sales point (finished goods inventory)
  - Code generation: `WH-2026-0001`

#### 3. Bill of Materials (BOM)
**Purpose**: Recipe definition for finished goods
- **Type**: Production Master Data
- **Key Fields**:
  - `id`, `code` (unique), `name`, `description`
  - `finishedGoodId` (reference to Item where itemType = FINISHED_GOOD)
  - `batchSize` (quantity of finished good produced)
  - `unitId` (unit for batch size)
  - `version` (for BOM versioning)
  - `isActive` (only one active BOM per finished good)
  - `status`, `isTrash`
  - `createdBy`, `createdAt`, `updatedAt`
- **Business Rules**:
  - One finished good can have multiple BOM versions (versioning)
  - Only one BOM can be active per finished good at a time
  - BOM defines the recipe (raw materials → finished good)
  - Code generation: `BOM-2026-0001`

#### 4. BOM Component
**Purpose**: Raw materials required in a BOM
- **Type**: Production Master Data (Child of BOM)
- **Key Fields**:
  - `id`, `bomId` (reference to BOM)
  - `rawMaterialId` (reference to Item where itemType = RAW_MATERIAL)
  - `quantity` (required quantity per batch)
  - `unitId` (unit of measurement)
  - `wastagePercentage` (optional - for food loss during production)
  - `sortOrder` (for display)
  - `notes` (optional)
- **Business Rules**:
  - Quantity is per batch (as defined in BOM.batchSize)
  - Wastage percentage accounts for food loss during cooking
  - Example: 1kg rice → 0.95kg cooked rice (5% wastage)

#### 5. Production Order
**Purpose**: Production instruction to create finished goods
- **Type**: Transaction Entity
- **Key Fields**:
  - `id`, `productionOrderNumber` (unique)
  - `bomId` (reference to BOM)
  - `finishedGoodId` (reference to Item)
  - `plannedQuantity` (quantity to produce)
  - `actualQuantity` (quantity actually produced - nullable)
  - `plannedStartDate`, `plannedEndDate`
  - `actualStartDate`, `actualEndDate` (nullable)
  - `status` (enum: DRAFT, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED)
  - `warehouseId` (production location - typically KITCHEN)
  - `notes`, `isTrash`
  - `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- **Business Rules**:
  - Created from BOM
  - Status flow: DRAFT → APPROVED → IN_PROGRESS → COMPLETED
  - Material issue happens when status = IN_PROGRESS
  - Finished goods receipt happens when status = COMPLETED
  - Code generation: `PO-2026-0001` (Production Order)

#### 6. Production Order Material
**Purpose**: Raw materials issued for production
- **Type**: Transaction Entity (Child of Production Order)
- **Key Fields**:
  - `id`, `productionOrderId` (reference to Production Order)
  - `rawMaterialId` (reference to Item)
  - `plannedQuantity` (from BOM calculation)
  - `issuedQuantity` (actual quantity issued - nullable)
  - `unitId` (unit of measurement)
  - `warehouseId` (source warehouse for material issue)
  - `issuedAt` (nullable - when material was issued)
  - `issuedBy` (nullable - user who issued)
- **Business Rules**:
  - Planned quantity calculated from BOM based on planned production quantity
  - Material issue creates stock transaction (OUT)
  - Issue happens when production order status = IN_PROGRESS

#### 7. Stock Transaction
**Purpose**: All inventory movements (in, out, transfer, adjustment)
- **Type**: Transaction Entity
- **Key Fields**:
  - `id`, `transactionNumber` (unique)
  - `transactionType` (enum: PURCHASE_IN, PRODUCTION_OUT, PRODUCTION_IN, SALE_OUT, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT)
  - `itemId` (reference to Item)
  - `warehouseId` (reference to Warehouse)
  - `quantity` (positive for IN, negative for OUT)
  - `unitId` (unit of measurement)
  - `unitCost` (cost per unit at time of transaction)
  - `totalCost` (quantity × unitCost)
  - `referenceType` (enum: PURCHASE, PRODUCTION_ORDER, SALE, TRANSFER, MANUAL)
  - `referenceId` (ID of related document - nullable)
  - `date`, `notes`
  - `createdBy`, `createdAt`
- **Business Rules**:
  - PURCHASE_IN: When Purchase status = RECEIVED
  - PRODUCTION_OUT: Material issue from Production Order
  - PRODUCTION_IN: Finished goods receipt from Production Order
  - SALE_OUT: When sale is confirmed (future sales module)
  - TRANSFER_OUT/IN: Warehouse transfers
  - ADJUSTMENT: Manual corrections
  - Each transaction updates InventoryBalance
  - Code generation: `ST-2026-0001`

#### 8. Inventory Balance
**Purpose**: Current stock levels per item per warehouse
- **Type**: Aggregate Entity (maintained by transactions)
- **Key Fields**:
  - `id`
  - `itemId` (reference to Item)
  - `warehouseId` (reference to Warehouse)
  - `quantity` (current stock level)
  - `unitId` (unit of measurement)
  - `averageCost` (weighted average cost)
  - `totalValue` (quantity × averageCost)
  - `lastTransactionDate` (last stock movement)
  - `updatedAt` (auto-updated on stock transaction)
- **Business Rules**:
  - One record per item per warehouse
  - Updated automatically by StockTransaction
  - Used for stock availability checks
  - Supports FIFO/LIFO/Average cost methods (averageCost field)

#### 9. Stock Transfer
**Purpose**: Transfer items between warehouses
- **Type**: Transaction Entity
- **Key Fields**:
  - `id`, `transferNumber` (unique)
  - `fromWarehouseId` (source warehouse)
  - `toWarehouseId` (destination warehouse)
  - `transferDate`, `expectedDeliveryDate` (nullable)
  - `status` (enum: DRAFT, IN_TRANSIT, COMPLETED, CANCELLED)
  - `notes`, `isTrash`
  - `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- **Business Rules**:
  - Creates two StockTransactions: TRANSFER_OUT and TRANSFER_IN
  - Status flow: DRAFT → IN_TRANSIT → COMPLETED
  - Code generation: `TR-2026-0001`

#### 10. Stock Transfer Item
**Purpose**: Items being transferred
- **Type**: Transaction Entity (Child of Stock Transfer)
- **Key Fields**:
  - `id`, `transferId` (reference to Stock Transfer)
  - `itemId` (reference to Item)
  - `quantity`, `unitId`
  - `unitCost` (cost at time of transfer)
- **Business Rules**:
  - Validates stock availability in source warehouse
  - Creates stock transactions on transfer completion

---

## 2. Relationships

### Entity Relationship Diagram (Textual)

```
Item (Master Data)
├── itemType: RAW_MATERIAL | FINISHED_GOOD | RETAIL
├── unitId → Unit
├── categoryId → Category (nullable)
│
├── As Finished Good:
│   └── BOM (one-to-many)
│       ├── finishedGoodId → Item (where itemType = FINISHED_GOOD)
│       └── BOM Component (one-to-many)
│           └── rawMaterialId → Item (where itemType = RAW_MATERIAL)
│
├── Production Orders (one-to-many)
│   └── Production Order
│       ├── bomId → BOM
│       ├── finishedGoodId → Item
│       ├── warehouseId → Warehouse
│       └── Production Order Material (one-to-many)
│           ├── rawMaterialId → Item
│           └── warehouseId → Warehouse
│
└── Stock Transactions (one-to-many)
    └── Stock Transaction
        ├── itemId → Item
        ├── warehouseId → Warehouse
        └── referenceId → Purchase | Production Order | Sale | Stock Transfer
        └── Updates → Inventory Balance

Warehouse (Master Data)
├── Stock Transactions (one-to-many)
├── Inventory Balances (one-to-many)
├── Production Orders (one-to-many)
└── Stock Transfers (one-to-many as fromWarehouse/toWarehouse)

Purchase (Existing)
└── When status = RECEIVED:
    └── Creates Stock Transaction (PURCHASE_IN)
        └── Updates Inventory Balance

ChartOfAccount (Existing)
├── Auto-created accounts:
│   ├── Inventory Account (ASSET) - per warehouse
│   ├── Cost of Goods Sold (EXPENSE)
│   └── Production Cost Account (EXPENSE)
└── Used in accounting entries for:
    ├── Purchase → Inventory (Dr. Inventory, Cr. Accounts Payable)
    ├── Production → Inventory (Dr. Inventory, Cr. Production Cost)
    └── Sale → COGS (Dr. COGS, Cr. Inventory)
```

### Key Relationships Summary

1. **Item → BOM → BOM Component → Item**
   - Finished Good Item → BOM → Raw Material Items
   - One finished good can have multiple BOM versions
   - BOM Components define raw material requirements

2. **BOM → Production Order → Production Order Material**
   - Production Order created from BOM
   - Production Order Materials calculated from BOM Components
   - Material issue creates Stock Transactions

3. **Item → Stock Transaction → Inventory Balance**
   - All stock movements tracked via Stock Transactions
   - Inventory Balance maintained per item per warehouse
   - Real-time stock levels

4. **Purchase → Stock Transaction**
   - When Purchase status = RECEIVED
   - Auto-creates PURCHASE_IN Stock Transaction
   - Updates Inventory Balance

5. **Production Order → Stock Transaction (2 types)**
   - PRODUCTION_OUT: Material issue (raw materials)
   - PRODUCTION_IN: Finished goods receipt

6. **Warehouse → All Inventory Entities**
   - All stock movements are warehouse-specific
   - Inventory balances per warehouse
   - Transfers between warehouses

---

## 3. Data Flow Explanation

### 3.1 Purchase to Inventory Flow

```
1. Purchase Order Created
   └── Purchase (status: DRAFT)
       └── PurchaseItem[] (raw materials)

2. Purchase Approved
   └── Purchase (status: APPROVED)

3. Goods Received
   └── Purchase (status: RECEIVED)
       └── [AUTO] Create Stock Transaction (PURCHASE_IN)
           ├── transactionType: PURCHASE_IN
           ├── itemId: from PurchaseItem
           ├── warehouseId: default warehouse (or specified)
           ├── quantity: from PurchaseItem
           ├── unitCost: from PurchaseItem.unitPrice
           └── referenceId: Purchase.id
       └── [AUTO] Update Inventory Balance
           ├── quantity += transaction.quantity
           ├── averageCost = weighted average
           └── totalValue = quantity × averageCost
       └── [AUTO] Create Accounting Entry (if enabled)
           ├── Dr. Inventory Account (ASSET)
           └── Cr. Accounts Payable (LIABILITY)
```

### 3.2 Production Flow (BOM-based)

```
1. BOM Definition
   └── BOM
       ├── finishedGoodId: Item (Chicken Biryani)
       ├── batchSize: 10 (servings)
       └── BOM Component[]
           ├── rawMaterialId: Item (Rice) - quantity: 2kg
           ├── rawMaterialId: Item (Chicken) - quantity: 1kg
           └── rawMaterialId: Item (Spices) - quantity: 0.5kg

2. Production Order Creation
   └── Production Order (status: DRAFT)
       ├── bomId: BOM.id
       ├── finishedGoodId: Item (Chicken Biryani)
       ├── plannedQuantity: 50 (servings)
       └── Production Order Material[] (calculated from BOM)
           ├── rawMaterialId: Rice - plannedQuantity: 10kg (2kg × 5 batches)
           ├── rawMaterialId: Chicken - plannedQuantity: 5kg
           └── rawMaterialId: Spices - plannedQuantity: 2.5kg

3. Production Order Approved
   └── Production Order (status: APPROVED)
       └── [CHECK] Stock availability for all materials
           └── Query Inventory Balance for each material

4. Production Started
   └── Production Order (status: IN_PROGRESS)
       └── [AUTO] Material Issue (when status changes to IN_PROGRESS)
           └── For each Production Order Material:
               └── Create Stock Transaction (PRODUCTION_OUT)
                   ├── transactionType: PRODUCTION_OUT
                   ├── itemId: rawMaterialId
                   ├── warehouseId: Production Order.warehouseId
                   ├── quantity: -issuedQuantity (negative)
                   ├── unitCost: from Inventory Balance.averageCost
                   └── referenceId: Production Order.id
               └── Update Inventory Balance
                   ├── quantity -= issuedQuantity
                   └── totalValue = quantity × averageCost
               └── [AUTO] Create Accounting Entry (if enabled)
                   ├── Dr. Production Cost Account (EXPENSE)
                   └── Cr. Inventory Account (ASSET)

5. Production Completed
   └── Production Order (status: COMPLETED)
       ├── actualQuantity: 48 (servings - actual produced)
       └── [AUTO] Finished Goods Receipt
           └── Create Stock Transaction (PRODUCTION_IN)
               ├── transactionType: PRODUCTION_IN
               ├── itemId: finishedGoodId
               ├── warehouseId: Production Order.warehouseId
               ├── quantity: actualQuantity (positive)
               ├── unitCost: calculated from material costs
               └── referenceId: Production Order.id
           └── Update Inventory Balance
               ├── quantity += actualQuantity
               ├── averageCost = weighted average
               └── totalValue = quantity × averageCost
           └── [AUTO] Create Accounting Entry (if enabled)
               ├── Dr. Inventory Account (ASSET) - Finished Goods
               └── Cr. Production Cost Account (EXPENSE)
```

### 3.3 Warehouse Transfer Flow

```
1. Stock Transfer Created
   └── Stock Transfer (status: DRAFT)
       ├── fromWarehouseId: MAIN
       ├── toWarehouseId: KITCHEN
       └── Stock Transfer Item[]
           ├── itemId: Rice - quantity: 50kg
           └── itemId: Spices - quantity: 10kg

2. Stock Transfer Approved
   └── Stock Transfer (status: IN_TRANSIT)
       └── [CHECK] Stock availability in source warehouse

3. Stock Transfer Completed
   └── Stock Transfer (status: COMPLETED)
       └── [AUTO] Create Stock Transactions
           ├── TRANSFER_OUT (fromWarehouse)
           │   ├── quantity: -50kg (negative)
           │   └── Updates Inventory Balance (fromWarehouse)
           └── TRANSFER_IN (toWarehouse)
               ├── quantity: +50kg (positive)
               └── Updates Inventory Balance (toWarehouse)
```

### 3.4 Inventory Adjustment Flow

```
1. Physical Stock Count
   └── Manual adjustment needed

2. Stock Transaction Created (Manual)
   └── Stock Transaction
       ├── transactionType: ADJUSTMENT
       ├── itemId: Item.id
       ├── warehouseId: Warehouse.id
       ├── quantity: difference (positive or negative)
       ├── referenceType: MANUAL
       └── notes: "Physical count adjustment"

3. Inventory Balance Updated
   └── quantity += adjustment quantity
```

### 3.5 Integration with Accounts Module

```
Production Cost Accounting:
1. Material Issue (PRODUCTION_OUT)
   └── Journal Entry Created
       ├── Dr. Production Cost Account (EXPENSE)
       └── Cr. Inventory Account - Raw Materials (ASSET)

2. Finished Goods Receipt (PRODUCTION_IN)
   └── Journal Entry Created
       ├── Dr. Inventory Account - Finished Goods (ASSET)
       └── Cr. Production Cost Account (EXPENSE)

Purchase Accounting:
1. Purchase Received
   └── Journal Entry Created
       ├── Dr. Inventory Account (ASSET)
       └── Cr. Accounts Payable (LIABILITY)

Sale Accounting (Future):
1. Sale Confirmed
   └── Journal Entry Created
       ├── Dr. Cost of Goods Sold (EXPENSE)
       └── Cr. Inventory Account - Finished Goods (ASSET)
```

### 3.6 Integration with Reports Module

```
Inventory Reports:
1. Stock Summary Report
   └── Query: Inventory Balance
       ├── Group by: Item, Warehouse
       ├── Show: quantity, averageCost, totalValue
       └── Filter: itemType, warehouse, status

2. Stock Movement Report
   └── Query: Stock Transaction
       ├── Filter: date range, item, warehouse, transactionType
       └── Show: all movements with costs

3. Production Cost Report
   └── Query: Production Order + Stock Transactions
       ├── Calculate: material costs, production efficiency
       └── Show: cost per finished good unit

4. Low Stock Alert Report
   └── Query: Inventory Balance
       ├── Filter: quantity < reorderPoint (if defined)
       └── Show: items needing restocking

5. BOM Cost Analysis
   └── Query: BOM + BOM Component + Inventory Balance
       ├── Calculate: current cost of BOM based on material prices
       └── Show: cost breakdown per finished good
```

---

## 4. Business Rules & Assumptions

### 4.1 Item Type Rules
- **RAW_MATERIAL**: 
  - Can only be purchased (not sold directly)
  - Used in BOM Components
  - Stock tracked in warehouses
  - Cost tracked for production costing

- **FINISHED_GOOD**:
  - Produced via BOM (not purchased)
  - Can be sold to customers
  - Stock tracked in warehouses
  - Cost calculated from production materials

- **RETAIL**:
  - Can be purchased or sold directly
  - Not part of production (beverages, sides)
  - Stock tracked in warehouses
  - Simple inventory management

### 4.2 Production Rules
- Production Order must reference an active BOM
- Material issue happens automatically when production starts
- Finished goods receipt happens when production completes
- Actual quantity can differ from planned (wastage, quality issues)
- Production cost = sum of material costs used

### 4.3 Inventory Rules
- Stock levels maintained per item per warehouse
- Average cost method used (weighted average)
- Stock transactions are immutable (for audit trail)
- Negative stock not allowed (enforced at transaction level)
- Stock availability checked before material issue

### 4.4 Warehouse Rules
- KITCHEN warehouse is primary production location
- RETAIL_OUTLET warehouses hold finished goods for sale
- MAIN warehouse holds bulk raw materials
- Transfers between warehouses tracked via Stock Transfer

### 4.5 Accounting Integration Rules
- Inventory accounts auto-created per warehouse (if enabled)
- Production cost accounts track material costs
- COGS account used when finished goods are sold
- All inventory movements can optionally create journal entries

### 4.6 Assumptions
1. **Cost Method**: Weighted Average Cost (can be extended to FIFO/LIFO)
2. **BOM Versioning**: Only one active BOM per finished good at a time
3. **Unit Conversion**: All quantities in BOM use same unit (no unit conversion)
4. **Wastage**: Handled via wastagePercentage in BOM Component
5. **Batch Tracking**: Not included (can be added later)
6. **Expiry Tracking**: Not included (can be added later)
7. **Multi-location Production**: Single production location per Production Order
8. **Partial Production**: Supported (actualQuantity can differ from plannedQuantity)

---

## 5. Integration Points Summary

### 5.1 Purchase Module Integration
- **Trigger**: Purchase status = RECEIVED
- **Action**: Auto-create Stock Transaction (PURCHASE_IN)
- **Updates**: Inventory Balance
- **Accounting**: Optional journal entry (Dr. Inventory, Cr. AP)

### 5.2 Accounts Module Integration
- **Inventory Accounts**: Auto-created per warehouse (ASSET type)
- **Production Cost Account**: Tracks material costs (EXPENSE type)
- **COGS Account**: Used when goods are sold (EXPENSE type)
- **Journal Entries**: Created for material issue and finished goods receipt

### 5.3 Reports Module Integration
- **Stock Reports**: Query Inventory Balance and Stock Transaction
- **Production Reports**: Query Production Order and related transactions
- **Cost Reports**: Calculate production costs from material usage
- **Movement Reports**: Track all stock movements by type, date, warehouse

---

## 6. Data Model Summary

### New Entities Required: 10
1. Item (with itemType enum)
2. Warehouse
3. BOM
4. BOM Component
5. Production Order
6. Production Order Material
7. Stock Transaction
8. Inventory Balance
9. Stock Transfer
10. Stock Transfer Item

### New Enums Required: 3
1. ItemType: RAW_MATERIAL, FINISHED_GOOD, RETAIL
2. WarehouseType: MAIN, STORAGE, KITCHEN, RETAIL_OUTLET
3. StockTransactionType: PURCHASE_IN, PRODUCTION_OUT, PRODUCTION_IN, SALE_OUT, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT
4. ProductionOrderStatus: DRAFT, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED
5. StockTransferStatus: DRAFT, IN_TRANSIT, COMPLETED, CANCELLED
6. StockTransactionReferenceType: PURCHASE, PRODUCTION_ORDER, SALE, TRANSFER, MANUAL

### Existing Entities Extended: 0
- All new entities (no modifications to existing models)

### Integration Points: 3
1. Purchase → Stock Transaction (on RECEIVED status)
2. Production Order → Stock Transaction (material issue & receipt)
3. Stock Transaction → Journal Entry (optional accounting integration)

---

**Last Updated**: January 23, 2026  
**Document Version**: 1.0.0
