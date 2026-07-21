# Technical Documentation: Promotional Expiry & Proportional Returns

This document details the architecture, data models, and logic implemented in `ffERP` to support:
1. **Promotional Expiry Controls** for item-level discounts.
2. **Proportional Discount Allocation** for order-level returns.

---

## 1. Promotional Expiry Controls

We introduced promotional settings on product catalog items. This enables cashiers and managers to configure discounts (both retail and wholesale) to expire automatically on a specific date.

### A. Data Schema
Two new columns were added to the `Item` model in `schema.prisma`:
*   `isPromo` (`Boolean`): Flag indicating if the product's discount is a promotion with an expiration date. Defaults to `false`.
*   `promoEndsAt` (`DateTime`, optional): The expiration date/time of the promotion.

```prisma
model Item {
  // ... other fields
  isPromo     Boolean   @default(false)
  promoEndsAt DateTime?
}
```

### B. Admin & Item Catalog UI
The product edit and creation forms (`itemForm.tsx`) include the promotional expiry controls nested in the **Pricing Information** section:
*   **Enable Promotional Expiry**: A checkbox toggle.
*   **Promotion Expiration Date**: A date picker input that appears dynamically only when "Enable Promotional Expiry" is checked.
*   **Default State**: If unchecked, the discount behaves permanently and does not expire.

### C. Server-Side & Client-Side Pricing Calculations

#### Client-Side (POS Screen)
In `POSComponent.tsx`, the `getBasePrice` helper validates whether the discount is active:
*   A helper method `isPromoActive(item)` checks if `isPromo` is true. If true, it compares the current browser time against `promoEndsAt`. If expired, it skips applying the retail/wholesale discount.
```typescript
const isPromoActive = (item: any) => {
  if (!item.isPromo) return true;
  if (!item.promoEndsAt) return false;
  return new Date() <= new Date(item.promoEndsAt);
};
```

#### Server-Side (Checkout Validation)
During wholesale checkouts in `sale.action.tsx` (`createSale` and `updateSale`), the backend retrieves `isPromo` and `promoEndsAt` columns from the DB. It recalculates pricing server-side, enforcing the same expiration check to prevent cashiers from manually bypassing promo expiry rules.

---

## 2. Proportional Discount Allocation on Returns

In POS returns, customers returning items purchased under an invoice-level discount (e.g. a coupon or flat cart discount) must be refunded the **actual net price paid** instead of the full undiscounted unit price.

### A. The Loophole (Before Adjustment)
*   Order-level discounts are stored in the database as a single flat number under `Sale.discount` (e.g., ৳10).
*   Individual items remain stored at their full prices in the `SaleItem` table (e.g., `unitPrice = ৳140`).
*   Historically, returning a product looked up `SaleItem.unitPrice` and refunded ৳140, ignoring the ৳10 invoice discount.

### B. Proportional Adjustment Logic
We modified `processSaleReturn` in `sale.action.tsx` to automatically calculate the discount ratio applied to the original invoice, adjusting the refund amount proportionally.

#### 1. Calculate original invoice discount ratio:
$$\text{Discount Ratio} = \frac{\text{Original Invoice Discount}}{\text{Original Subtotal}}$$

#### 2. Apply ratio to compute net unit price:
$$\text{Net Unit Price} = \text{Item Stored Unit Price} \times (1 - \text{Discount Ratio})$$

*   *Example*: A ৳140 item with ৳10 order discount (7.14% ratio) is refunded at:
    $$140 \times (1 - 0.07142857) = \text{৳130.00}$$

### C. Technical Implementation in `sale.action.tsx`
```typescript
const originalDiscount = originalSale ? Number(originalSale.discount || 0) : 0;
const originalSubtotal = originalSale ? Number(originalSale.subTotal || 0) : 0;
const discountRatio = originalSubtotal > 0 ? (originalDiscount / originalSubtotal) : 0;

// Inside return items loop:
itemUnitPrice = Number(originalItem.unitPrice) * (1 - discountRatio);
```

### D. Architectural Advantages of this Approach
*   **Database Integrity**: The original sale items, subtotals, and discount fields remain stored at their standard values, ensuring printed invoice receipts and sales history records display correctly.
*   **Safety**: Only return action handlers are affected, resulting in **zero risk** of breaking active POS checkout logic, customer invoicing, or double-entry accounting configurations during sales.
