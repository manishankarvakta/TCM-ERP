# Dashboard KPI Metrics Calculation & Data Guide

This document explains the data architecture, database queries, and mathematical formulas used to calculate each metric displayed in the **Dashboard KPI Cards Section** ([BeautifulDashboard.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/components/dashboard/BeautifulDashboard.tsx) and [dashboard-realtime.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/actions/dashboard-realtime.action.ts)).

---

## Overview Architecture

All KPI metrics are dynamically fetched in real time via the Server Action `getRealtimeDashboardStats`:
* **Warehouse Filtering**: If a warehouse is selected (e.g. `WH-2026-0001`), all queries filter records specifically for that warehouse. If "All Warehouse" is selected (Admin mode), queries aggregate across all active warehouses.
* **Time Range Filtering**: Filters records by `today`, `this-week`, `this-month`, `this-year`, or `custom` date range (`from` & `to`).
* **Comparative Growth %**: Every financial card calculates period-over-period growth by comparing the current date range against the equivalent preceding date range (e.g. today vs yesterday, this week vs last week).

---

## KPI Metrics Calculation Breakdown

### 1. Sale Revenue
* **Description**: Gross monetary value generated from sales transactions.
* **Prisma Model**: `Sale`
* **Filter Conditions**: `isTrash: false`, `createdAt: { gte: currentStart, lte: currentEnd }`, `warehouseId` (if filtered).
* **Formula**:
  $$\text{Sale Revenue} = \sum_{\text{Sale} \in \text{Current Sales}} \text{Sale.grandTotal}$$
* **Growth Formula**:
  $$\text{Revenue Growth \%} = \frac{\text{Current Revenue} - \text{Previous Revenue}}{\text{Previous Revenue}} \times 100$$

---

### 2. Sale Discounts
* **Description**: Total monetary discounts provided on sales, broken down into General Discounts and Coupon Discounts.
* **Prisma Models**: `Sale`, `Coupon`
* **Sub-Metric Calculations**:
  1. **General Discount**: Sum of discounts on sales where no promo coupon code was applied (`couponId` is `null`).
     $$\text{General Discount} = \sum_{\text{Sale.couponId is null}} \text{Sale.discount}$$
  2. **Coupon Discount**: Sum of discounts on sales where a promo coupon code was applied (`couponId` is not `null`).
     $$\text{Coupon Discount} = \sum_{\text{Sale.couponId is not null}} \text{Sale.discount}$$
  3. **Total Sale Discount**:
     $$\text{Total Sale Discount} = \text{General Discount} + \text{Coupon Discount}$$
* **Growth Formula**:
  $$\text{Discount Growth \%} = \frac{\text{Current Total Discount} - \text{Previous Total Discount}}{\text{Previous Total Discount}} \times 100$$

---

### 3. Paid Sale
* **Description**: Net revenue collected at the exact time of order placement.
* **Prisma Model**: Derived from `Sale` revenue and calculated `Due Sale`.
* **Formula**:
  $$\text{Paid Sale} = \max(0, \text{Sale Revenue} - \text{Due Sale})$$
* **Growth Formula**:
  $$\text{Paid Sale Growth \%} = \frac{\text{Current Paid Sale} - \text{Previous Paid Sale}}{\text{Previous Paid Sale}} \times 100$$

---

### 4. Due Sale
* **Description**: Outstanding unpaid balances remaining on sales placed within the selected period.
* **Prisma Field**: Evaluates `Sale.paymentDetails` (JSON column containing initial cash/card/MFS breakdown and due collection logs).
* **Per Sale Due Formula**:
  $$\text{initialPaid} = \text{cashAmount} + \text{cardAmount} + \text{mfsAmount} - \text{changeAmount}$$
  $$\text{totalCollected} = \sum (\text{dueCollections}[].\text{cashAmount} + \text{cardAmount} + \text{mfsAmount})$$
  $$\text{saleDue} = \max(0, \text{Sale.grandTotal} - \text{initialPaid} - \text{totalCollected})$$
* **Formula**:
  $$\text{Due Sale Total} = \sum_{\text{Sale} \in \text{Current Sales}} \text{saleDue}$$
* **Growth Formula**:
  $$\text{Due Growth \%} = \frac{\text{Current Due Sale} - \text{Previous Due Sale}}{\text{Previous Due Sale}} \times 100$$

---

### 5. Collections Received
* **Description**: Total payments collected from past credit clients during the current period (regardless of when the original sale was placed).
* **Prisma Field**: Evaluates `dueCollections[]` inside `Sale.paymentDetails` JSON across completed non-trash sales.
* **Filter Conditions**: Filtered where collection date is within current start and end range (`colDate >= currentStart && colDate <= currentEnd`).
* **Formula**:
  $$\text{Collections Received} = \sum_{\text{Collection Date in Range}} (\text{cashAmount} + \text{cardAmount} + \text{mfsAmount})$$
* **Growth Formula**:
  $$\text{Collections Growth \%} = \frac{\text{Current Collections} - \text{Previous Collections}}{\text{Previous Collections}} \times 100$$

---

### 6. Purchase
* **Description**: Gross monetary value spent on procurement of goods and raw materials.
* **Prisma Model**: `Purchase`
* **Filter Conditions**: `isTrash: false`, `createdAt: { gte: currentStart, lte: currentEnd }`, `warehouseId` (if filtered).
* **Formula**:
  $$\text{Purchase Total} = \sum_{\text{Purchase} \in \text{Current Purchases}} \text{Purchase.grandTotal}$$
* **Growth Formula**:
  $$\text{Purchase Growth \%} = \frac{\text{Current Purchase} - \text{Previous Purchase}}{\text{Previous Purchase}} \times 100$$

---

### 7. Expenses
* **Description**: Total operational expenditure incurred through payment vouchers (e.g. rent, salaries, utilities, petty cash).
* **Prisma Model**: `VoucherLine` joined with `Voucher`
* **Filter Conditions**: `Voucher.type = 'PAYMENT'`, `Voucher.createdAt: { gte: currentStart, lte: currentEnd }`, `debitAmount > 0`, warehouse filter applied.
* **Formula**:
  $$\text{Expenses Total} = \sum_{\text{VoucherLine}} \text{VoucherLine.debitAmount}$$
* **Growth Formula**:
  $$\text{Expenses Growth \%} = \frac{\text{Current Expenses} - \text{Previous Expenses}}{\text{Previous Expenses}} \times 100$$

---

### 8. Retail Stock & Value
* **Description**: Total physical inventory volume and financial valuations for warehouse stock.
* **Prisma Models**: `Stock` joined with `Item` and `ProductVariant`.
* **Filter Conditions**: `Stock.quantity > 0`, excludes items where `Item.isTrash = true` or `Item.status = 'inactive'`.
* **Sub-Metric Calculations**:
  1. **Total Quantity**: Physical stock count in units/pieces.
     $$\text{Total Quantity} = \sum_{\text{Stock}} \text{Stock.quantity} \quad (\text{pcs})$$
  2. **Sale Value** (Total Retail Selling Value): Total monetary value if all stock is sold at retail sales price.
     $$\text{Sale Value} = \sum_{\text{Stock}} \text{Stock.quantity} \times \left( \text{Variant.salesPrice} \mathbin{\Vert} \text{Item.salesPrice} \mathbin{\Vert} 0 \right)$$
  3. **Stock Value** (Total Cost / Purchase Value): Total procurement cost value of current stock.
     $$\text{Stock Value} = \sum_{\text{Stock}} \text{Stock.quantity} \times \left( \text{Variant.costPrice} \mathbin{\Vert} \text{Item.costPrice} \mathbin{\Vert} 0 \right)$$

---

## File Reference Map

* **Server Action**: [dashboard-realtime.action.ts](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/app/actions/dashboard-realtime.action.ts)
* **Frontend UI Component**: [BeautifulDashboard.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/components/dashboard/BeautifulDashboard.tsx)
* **Database Schema**: [schema.prisma](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/prisma/schema.prisma)
