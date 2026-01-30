# Sales Module Redux Implementation

## Overview
The Sales module uses Redux Toolkit to manage the complex state of the Sales Form (`saleForm.tsx`). This ensures performant, real-time calculations for subtotals, taxes, and grand totals without excessive re-renders, mirroring the architecture of the Production and Purchase modules.

## Architecture

### 1. Store Configuration
The sales reducer is registered in the global Redux store (`lib/store.ts`):
```typescript
import salesReducer from "@/lib/redux/slices/salesSlice";

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      // ... other reducers
      sales: salesReducer,
    },
    // ...
  });
  return store;
};
```

### 2. State Slice (`salesSlice.ts`)
The `salesSlice` manages the entire form state, including metadata, items, and financial calculations.

#### State Structure
```typescript
interface SaleState {
  clientId: string;
  warehouseId: string;
  date: string;
  status: string;
  notes: string;
  
  items: SaleItem[];
  discount: number;
  tax: number;
  autoTaxEnabled: boolean;
  
  subTotal: number;
  grandTotal: number;
}
```

#### Key Actions
*   **Item Management**: `addSaleItem`, `removeSaleItem`, `setSaleItem`, `setSaleItemQuantity`, `setSaleItemUnitPrice`.
*   **Financials**: `setSaleDiscount`, `setSaleTax` (manual), `toggleSaleAutoTax` (automatic 15% VAT).
*   **Metadata**: `setSaleMetadata`, `initializeSale`, `resetSale`.

#### Auto-Calculation Logic
Calculations happen synchronously within the reducer to ensure the UI is always consistent:
*   **Subtotal**: derived from sum of `item.amount`.
*   **Tax**:
    *   If `autoTaxEnabled` is `true`, tax = `subTotal * 0.15`.
    *   If `autoTaxEnabled` is `false`, tax is set manually.
*   **Grand Total**: `subTotal - discount + tax`.

### 3. Component Integration (`saleForm.tsx`)
The form component acts as a bridge between React Hook Form (RHF) and Redux.

*   **Initialization**: On mount, `useEffect` populates the Redux state from `initialData` (if editing) or defaults.
*   **Unidirectional Sync (Form -> Redux)**:
    *   The `useWatch` hook monitors RHF inputs (quantity, price, discount, tax).
    *   `useEffect` hooks dispatch changes to Redux (e.g., `setSaleItemQuantity`).
    *   This triggers the reducer's calculation logic.
*   **Feedback Sync (Redux -> Form)**:
    *   The component subscribes to Redux selectors (`salesState.subTotal`, `salesState.tax`).
    *   If Redux updates a calculated value (like auto-tax), `setValue` updates the RHF state to ensure the correct data is submitted.

## Usage Guide

### Enabling Auto-Tax
1.  Click the "Auto 15%" button next to the Tax input.
2.  The input disables and automatically updates as items are added.
3.  To manually override, toggle the button off.

### Adding Items
1.  Select an item from the dropdown.
2.  The unit price is automatically populated from the master data.
3.  Adjusting quantity instantly updates the line amount and totals.

## Future Improvements
*   **Stock Validation**: Integrate real-time stock checking against the Redux state similar to the Production module.
*   **Async Sync**: Implement debouncing for network-heavy validations if added in the future.
