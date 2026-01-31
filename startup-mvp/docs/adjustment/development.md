# Inventory Adjustment Module Documentation

## Overview
The Inventory Adjustment module allows authorized users to correct stock levels in specific warehouses. This is used for shrinkages, damages, or finding extra stock.
Adjustments follow a **Draft -> Approved** workflow.

## Directory Structure
`app/(dashboard)/dashboard/inventory/adjustments/`
- `page.tsx`: Main list view.
- `[id]/page.tsx`: Detail view.
- `add/page.tsx`: Create view.
- `_components/`: UI Components.
- `_actions/`: Server Actions.

## Key Components

### 1. AdjustmentList (`_components/adjustment-list.tsx`)
- Displays paginated table of adjustments.
- **Actions**:
  - **View**: Navigates to detail page.
  - **Approve** (Draft only): Triggers `approveAdjustment`. Uses `AlertDialog` for confirmation.
  - **Delete** (Draft only): Triggers `deleteAdjustment`. Uses `AlertDialog` for confirmation.
- **Feedback**: Uses `sonner` toast notifications for success/error states.

### 2. AdjustmentForm (`add/_components/adjustment-form.tsx`)
- Form to create new adjustments.
- **Features**:
  - **Warehouse Selection**: Fetches stock for selected warehouse.
  - **Dynamic Item Rows**: Add/remove items.
  - **Stock Display**: Shows current available stock in the item dropdown (fetched via `getWarehouseStocks`).
  - **Auto-Calculation**: Updates Amount based on Quantity * Unit Rate.
- **State Management**: Uses `react-hook-form` with `zod` validation.

### 3. AdjustmentDetails (`_components/adjustment-details.tsx`)
- Read-only view of an adjustment.
- Displays General Info (Date, Warehouse, Status) and Item Table.

## Server Actions (`_actions/adjustment.action.ts`)

### `getAdjustments`
- Fetches paginated adjustments with relations (Warehouse, User).
- Supports search and filtering.

### `createAdjustment`
- Creates a new `Adjustment` record with status `DRAFT`.
- Creates related `AdjustmentItem` records.
- **Validation**: Checks for valid warehouse and items.

### `approveAdjustment`
- **Transactional Operation**:
  1. Verifies Adjustment is in `DRAFT` status.
  2. Updates Status to `COMPLETED`.
  3. **Stock Update**: Iterates through items and updates `Stock` quantity in the specific warehouse.
  4. **History**: Creates `StockHistory` record for tracking.
  5. **Accounting**: Creates a `Journal Voucher` to reflect inventory value change (Inventory Asset vs. Adjustment Expense/Income).

### `deleteAdjustment`
- Deletes an adjustment and its items.
- **Constraint**: Only allowed if status is `DRAFT`.

## Permissions
- **Key**: `inventory.adjustments`
- **Operations**: `view`, `create`, `edit`, `delete`, `approve` (custom).

## Recent UI Improvements
- **Dialogs**: Replaced native `confirm` with Shadcn `AlertDialog`.
- **Notifications**: Replaced `alert` with `sonner` toasts.
- **Stock Visibility**: Added stock quantity visibility in selection dropdowns.
