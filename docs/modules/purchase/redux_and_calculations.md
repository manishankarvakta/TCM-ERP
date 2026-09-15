# Redux Implementation & Calculation Logic

## Overview
The Purchase Module uses **Redux Toolkit** to handle the complex state management required for the dynamic purchase form. This approach was chosen to:
1.  **Prevent Prop Drilling**: Avoid passing callbacks through multiple component layers.
2.  **Ensure Real-Time Performance**: Calculate totals instantly without waiting for backend calls.
3.  **Separate Concern**: Keep calculation logic distinct from UI presentation.

## 1. State Structure (`lib/redux/slices/purchaseSlice.ts`)

The Redux store maintains the following state tree for purchases:

```typescript
interface PurchaseState {
  items: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number; // Calculated (qty * price)
  }>;
  discount: number;
  tax: number;
  subTotal: number; // Sum of all item amounts
  grandTotal: number; // SubTotal - Discount + Tax
}
```

## 2. Calculation Logic

Calculations are performed **immediately** within the reducers whenever a relevant action is dispatched. This ensures the store always represents a valid snapshot of the order's financial totals.

### Formulas
*   **Line Amount**:
    $ \text{Amount} = \text{Quantity} \times \text{Unit Price} $
*   **Subtotal**:
    $ \text{SubTotal} = \sum (\text{Item Amounts}) $
*   **Grand Total**:
    $ \text{GrandTotal} = \text{SubTotal} - \text{Discount} + \text{Tax} $

## 3. Reducers & Actions

| Action | Payload | Effect |
| :--- | :--- | :--- |
| **`setItem`** | `{index, itemId, ...}` | Updates item details, recalculates line amount, subtotal, and grand total. |
| **`setQuantity`** | `{index, quantity}` | Updates quantity, recalculates line amount, subtotal, and grand total. |
| **`setUnitPrice`** | `{index, unitPrice}` | Updates unit price, recalculates line amount, subtotal, and grand total. |
| **`addItem`** | *None* | Pushes a new empty row to the items array. |
| **`removeItem`** | `index` | Removes row at index, recalculates subtotal and grand total. |
| **`setDiscount`** | `amount` | Updates discount, recalculates grand total. |
| **`setTax`** | `amount` | Updates tax, recalculates grand total. |
| **`resetPurchase`** | *None* | Clears all state to default (1 empty row, 0 totals). |
| **`initializePurchase`** | `Partial<State>` | Hydrates the state (used for **Edit Mode**). |

## 4. Integration with React Hook Form

The `PurchaseForm` component synchronizes two state systems:
1.  **React Hook Form (RHF)**: Manages form validation, input registration (`register`), and submission.
2.  **Redux**: Manages calculations and display of totals.

**Synchronization Strategy**:
*   **On Change**: When a user inputs data (e.g., changes quantity), an `onChange` handler fires.
    *   It updates RHF state (for validation).
    *   It dispatches a Redux action (calculate totals).
*   **On Submit**: The form gathers data from RHF (which is the source of truth for submission) but relies on Redux for the calculated grand total if needed for display validation.

## 5. File Location
*   **Slice Definition**: `lib/redux/slices/purchaseSlice.ts`
*   **Store Configuration**: `lib/store.ts` (Mounted at `state.purchase`)
