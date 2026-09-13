# Add Purchase Active Session Draft Auto-Save & Recovery Developer Documentation

## 1. Overview

This document describes the design, implementation, data structure, and lifecycle handlers for the **Add Purchase Active Session Draft Auto-Save & Recovery System** in **ffERP**.

### Problem Statement
Previously, when a procurement manager or cashier was filling out the **Add New Purchase** form (`/dashboard/procurements/purchases/add`), selecting a supplier, picking a warehouse, adding product items with quantities/prices, and entering notes or attachments, all form state was held in React Hook Form and transient Redux state. If the browser was reloaded (`F5`), refreshed, or closed accidentally, the entire unsubmitted purchase draft was lost.

### Solution Architecture
We implemented an **active session draft auto-save and auto-hydration engine** in [`purchaseForm.tsx`](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/%28dashboard%29/dashboard/procurements/purchases/_components/purchaseForm.tsx). When `mode === "create"`, it continuously persists active form data to browser `localStorage` under the key `purchase_active_draft` and seamlessly restores it upon page reload.

---

## 2. Active Draft Data Model

The active purchase session draft is serialized as a JSON object with the following TypeScript schema:

```typescript
interface PurchaseActiveDraft {
  supplierId: string;        // ID of the selected supplier
  warehouseId: string;       // ID of the destination warehouse
  date: string;              // ISO string representation of the purchase date
  status: PurchaseStatus;    // "DRAFT" | "APPROVED" | "CANCELLED"
  notes: string;             // Purchase notes / terms
  attachmentUrl: string;     // Media attachment URL
  discount: number;          // Overall purchase discount amount
  tax: number;               // Overall purchase tax amount
  items: Array<{             // Line items included in purchase
    itemId?: string | null;
    variantId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  timestamp: number;         // Unix epoch timestamp when draft was last saved
}
```

---

## 3. Workflows & Lifecycle Handlers

```mermaid
flowchart TD
    A[User selects supplier / adds items / enters notes] --> B[Auto-Save useEffect triggered]
    B --> C{Has content in items / supplier / notes?}
    C -- Yes --> D[Serialize active form state to localStorage 'purchase_active_draft']
    C -- No --> E[Remove 'purchase_active_draft' from localStorage]
    
    F[Page Reload / F5 / Browser Crash] --> G[Mount Auto-Hydration useEffect]
    G --> H{Does 'purchase_active_draft' exist with items > 0?}
    H -- Yes --> I[Restore form values & dispatch Redux initializePurchase]
    I --> J[Display 'Restored X item(s)...' toast notification]
    H -- No --> K[Initialize clean Add Purchase form]
    
    L[Purchase Created / Cancel Clicked] --> M[Invoke onSubmit / Cancel handler]
    M --> N[Wipe 'purchase_active_draft' from localStorage]
```

### 3.1 Auto-Save Mechanism
A `useEffect` hook monitors changes across all form fields when `mode === "create"`:

```typescript
useEffect(() => {
  if (mode !== "create") return;
  try {
    const hasContent =
      (watchedItems &&
        watchedItems.some(
          (i: any) =>
            i.itemId ||
            i.description ||
            (Number(i.quantity) || 0) > 1 ||
            (Number(i.unitPrice) || 0) > 0
        )) ||
      !!watchedSupplierId ||
      !!watchedNotes;

    if (hasContent) {
      const draftData = {
        supplierId: watchedSupplierId || "",
        warehouseId: watchedWarehouseId || "",
        date: watchedDate ? new Date(watchedDate).toISOString() : new Date().toISOString(),
        status: watchedStatus || "DRAFT",
        notes: watchedNotes || "",
        attachmentUrl: watchedAttachmentUrl || "",
        discount: Number(watchedDiscount) || 0,
        tax: Number(watchedTax) || 0,
        items: watchedItems || [],
        timestamp: new Date().getTime(),
      };
      localStorage.setItem("purchase_active_draft", JSON.stringify(draftData));
    } else {
      localStorage.removeItem("purchase_active_draft");
    }
  } catch (e) {
    console.error("Failed to auto-save purchase active draft", e);
  }
}, [
  mode,
  watchedItems,
  watchedSupplierId,
  watchedWarehouseId,
  watchedDate,
  watchedStatus,
  watchedNotes,
  watchedAttachmentUrl,
  watchedDiscount,
  watchedTax,
]);
```

---

## 4. Safety & Isolation Constraints

1. **Create Mode Scoping**:
   Auto-save and auto-hydration logic strictly checks `if (mode !== "create") return;`. When editing an existing purchase (`mode === "edit"`), auto-draft is disabled to avoid overwriting real DB data.

2. **Redux Calculation Sync**:
   During auto-hydration on mount, calling `dispatch(initializePurchase(...))` ensures Redux instant calculation engine (`subTotal`, `grandTotal`) calculates correct totals immediately without requiring user focus/blur events.

3. **Automatic Cleanup**:
   - On successful `createPurchase` submission in `onSubmit`: `localStorage.removeItem("purchase_active_draft")`.
   - On clicking the form **Cancel** button: `localStorage.removeItem("purchase_active_draft")`.
