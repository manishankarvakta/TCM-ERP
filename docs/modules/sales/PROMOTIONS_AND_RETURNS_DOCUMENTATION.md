# Technical Documentation: Promotional Expiry & Proportional Returns

This document details the architecture, data models, and logic implemented in `ffERP` to support:
1. **Promotional Expiry Controls** for item-level discounts.
2. **Proportional Discount Allocation** for order-level returns.
3. **Discount Ledger Adjustments** on sales returns.

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

---

## 3. Discount Ledger Adjustments on Returns

To ensure accounting general ledger balances are accurate when a return is processed, the return voucher must reverse the proportional discount amount and attribute it to the correct Coupon or General Sales Discount account.

### A. Original Checkout Posting Voucher
When a sale is checked out, the discount is recorded as a debit entry:
*   **Debit**: `Sales Coupon Discount` (or `Sales Discount` general)
*   **Credit**: `Sales Revenue` (for full item price)

### B. Return Posting Voucher (Adjusted)
When a return is processed, the return voucher reverses both the sales revenue and the discount proportionally:
*   **Debit**: `Sales Revenue` $\rightarrow$ `Full Price (undiscounted)` (e.g. ৳140)
*   **Credit**: `Cash/AR` $\rightarrow$ `Net Refunded Price` (e.g. ৳130)
*   **Credit**: `Sales Coupon Discount` (or `Sales Discount` general) $\rightarrow$ `Proportional Discount Reversed` (e.g. ৳10)

This reverses all entries completely, returning the Sales Revenue, Sales Discount, and Cash balances to exactly **0** for the returned product.

### C. Technical Implementation in `sale.action.tsx`
```typescript
// Split discount ratios of original sale:
const couponRatio = originalSubtotal > 0 ? (couponDiscount / originalSubtotal) : 0;
const generalRatio = originalSubtotal > 0 ? (generalDiscount / originalSubtotal) : 0;

// inside loop, accumulate:
totalFullRevenueToDebit += itemFullUnitPrice * ret.quantity;
totalCouponDiscountToCredit += itemCouponDiscount * ret.quantity;
totalGeneralDiscountToCredit += itemGeneralDiscount * ret.quantity;

// Build voucher lines:
const lines = [
  {
    lineNumber: 1,
    chartOfAccountId: debitAccountId, // Sales Revenue
    debitAmount: Number(totalFullRevenueToDebit.toFixed(2)),
    creditAmount: 0,
    description: `Sales Return (Debit Revenue)`
  },
  {
    lineNumber: 2,
    chartOfAccountId: creditAccountId, // Cash/AR
    debitAmount: 0,
    creditAmount: Number(totalRefund.toFixed(2)),
    description: `Refund for Sales Return (Credit Cash/AR)`
  }
];

if (totalCouponDiscountToCredit > 0 && couponDiscountAccountId) {
  lines.push({
    lineNumber: 3,
    chartOfAccountId: couponDiscountAccountId,
    debitAmount: 0,
    creditAmount: Number(totalCouponDiscountToCredit.toFixed(2)),
    description: `Sales Return - Reverse Coupon Discount (Credit)`
  });
}
if (totalGeneralDiscountToCredit > 0 && salesDiscountAccountId) {
  lines.push({
    lineNumber: 4,
    chartOfAccountId: salesDiscountAccountId,
    debitAmount: 0,
    creditAmount: Number(totalGeneralDiscountToCredit.toFixed(2)),
    description: `Sales Return - Reverse General Discount (Credit)`
  });
}
```
