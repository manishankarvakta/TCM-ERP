# FF-ERP E-commerce API Frontend Integration Guide

This guide is designed for frontend developers or frontend AI agents integrating a separate storefront application with the FF-ERP backend API.

---

## 1. Overview

FF-ERP provides a public e-commerce API allowing storefront applications to perform customer operations, search catalog items, validate carts, verify coupons, and execute checkout transactions securely.

The storefront must use this API for:
* Customer registration & secure authentication.
* Customer profile & shipping address management.
* Product search, category listings, and details queries.
* Real-time stock verification and cart calculations.
* Promotional coupon validation.
* Checkout placement (orders history & draft cancellations).

> [!IMPORTANT]  
> **Source of Truth Rule**: The frontend storefront is responsible for collecting user intent and displaying data. The storefront **must not** calculate or trust final prices, tax totals, coupon discounts, shipping fees, or stock counts locally. The backend is the single source of truth and recalculates all totals server-side during cart validation and checkouts.

---

## 2. Base URL and Environment Variable

Specify the backend API address in your frontend configuration:

```env
# Storefront .env configuration
NEXT_PUBLIC_ECOMMERCE_API_URL=https://your-ff-erp-api-domain.com
```

In your application code, resolve the base URL:

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_ECOMMERCE_API_URL || "http://localhost:3000";
```

All requests must use the full backend API base URL when connecting to the API from separate origins.

---

## 3. Authentication Strategy

* **Cookie-Based Sessions**: Logging in issues an HTTP-Only secure cookie (`ecom_client_token`) containing a signed JWT.
* **Credentials Propagation**: The frontend **must** set `credentials: "include"` on all fetch calls to ensure session cookies are sent by the browser.
* **Storage restriction**: **Do NOT store JWT tokens or session tokens in `localStorage` or `sessionStorage`**. Doing so exposes customer accounts to Cross-Site Scripting (XSS) token theft.
* **Session Expiry**: Session tokens expire in 30 days.
* **Global 401 Handler**: Any request returning an HTTP `401 Unauthorized` status must be intercepted globally to redirect the customer to the storefront login route (e.g. `/login?redirect=...`).

### Fetch Authentication Example

```ts
const response = await fetch(`${API_BASE_URL}/api/ecommerce/auth/me`, {
  method: "GET",
  credentials: "include", // Essential for HttpOnly cookies
});
```

---

## 4. Standard Response Format

The backend API returns standardized JSON responses.

### Success Response
```json
{
  "success": true,
  // Additional payloads (e.g. "client", "products", "order")
}
```

### Error Response
```json
{
  "success": false,
  "message": "Detailed error explanation here"
}
```

### HTTP Status Codes

* **`200`**: Successful request execution.
* **`400`**: Bad Request (validation errors, invalid coupon formats, unavailable checkout items, or illegal cancellation transitions).
* **`401`**: Unauthorized (missing or expired session cookies).
* **`404`**: Resource not found (missing product, variant, address, or order).
* **`500`**: Internal Server Error.

---

## 5. Recommended Frontend API Client

Use the following reusable client layer in your storefront application to standardize requests and handle authorization states:

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_ECOMMERCE_API_URL || "";

export async function ecommerceFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include", // Propagates ecom_client_token HttpOnly cookie
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = { success: false, message: `HTTP Error: ${response.status} ${response.statusText}` };
  }

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      // Redirect to login, appending redirect parameters
      window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
    }
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Request execution failed");
  }

  return data as T;
}
```

---

## 6. API Endpoint Documentation

### 6.1 Authentication APIs

#### Register Customer
* **Method & URL**: `POST /api/ecommerce/auth/register`
* **Auth Required**: No
* **Request Body**:
  ```json
  {
    "phone": "01700000001",
    "password": "customerpassword123",
    "name": "Jane Doe",
    "email": "jane@example.com" // Optional
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "client": {
      "id": "cmr2126qz0001ck4v75a8lh65",
      "phone": "01700000001",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "clientType": "regular"
    }
  }
  ```
* **Frontend Notes**: Customer accounts are keyed by their `phone` number. Duplicate phone numbers are rejected by the registration validator.

#### Login Customer
* **Method & URL**: `POST /api/ecommerce/auth/login`
* **Auth Required**: No
* **Request Body**:
  ```json
  {
    "phone": "01700000001",
    "password": "customerpassword123"
  }
  ```
* **Success Response (200)**: Sets the HTTP-Only cookie `ecom_client_token` in the browser headers.
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "JWT_TOKEN_HERE"
  }
  ```

#### Logout Customer
* **Method & URL**: `POST /api/ecommerce/auth/logout`
* **Auth Required**: No
* **Success Response (200)**: Clears the `ecom_client_token` cookie.
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

#### Hydrate Session / Me
* **Method & URL**: `GET /api/ecommerce/auth/me`
* **Auth Required**: Yes
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "client": {
      "id": "cmr2126qz0001ck4v75a8lh65",
      "name": "Jane Doe",
      "phone": "01700000001",
      "email": "jane@example.com",
      "clientType": "regular"
    }
  }
  ```
* **Frontend Notes**: Call this endpoint on storefront load to check if the user has an active session cookie and hydrate the global storefront user state.

#### Change Password
* **Method & URL**: `POST /api/ecommerce/auth/change-password`
* **Auth Required**: Yes
* **Request Body**:
  ```json
  {
    "oldPassword": "customerpassword123",
    "newPassword": "newsecurepassword456"
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```

---

### 6.2 Customer Profile APIs

#### Get Profile details
* **Method & URL**: `GET /api/ecommerce/client/profile`
* **Auth Required**: Yes
* **Success Response (200)**: Returns client model fields (excluding password hashes and admin account codes).

#### Update Profile details
* **Method & URL**: `PATCH /api/ecommerce/client/profile`
* **Auth Required**: Yes
* **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "janesmith@example.com"
  }
  ```
* **Success Response (200)**: Returns the updated, sanitized client record.

---

### 6.3 Customer Address APIs

#### List Shipping Addresses
* **Method & URL**: `GET /api/ecommerce/client/addresses`
* **Auth Required**: Yes
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "addresses": [
      {
        "id": "cmr227a6t0001ckysqb0nuke2",
        "recipientName": "Jane Doe",
        "phone": "01700000001",
        "addressLine": "House 1, Road 2",
        "area": "Dhanmondi",
        "city": "Dhaka",
        "district": "Dhaka",
        "division": "Dhaka",
        "country": "Bangladesh",
        "isDefault": true
      }
    ]
  }
  ```

#### Create Shipping Address
* **Method & URL**: `POST /api/ecommerce/client/addresses`
* **Auth Required**: Yes
* **Request Body**:
  ```json
  {
    "recipientName": "Jane Doe",
    "phone": "01700000001",
    "addressLine": "House 1, Road 2",
    "area": "Dhanmondi", // Optional
    "city": "Dhaka",
    "district": "Dhaka",
    "division": "Dhaka",
    "country": "Bangladesh",
    "isDefault": false // Set true to make it default shipping destination
  }
  ```
* **Success Response (200)**: Returns the newly created address object with its CUID `id`.

#### Delete Address
* **Method & URL**: `DELETE /api/ecommerce/client/addresses/[id]`
* **Auth Required**: Yes

#### Set Default Address
* **Method & URL**: `PATCH /api/ecommerce/client/addresses/[id]/default`
* **Auth Required**: Yes

---

### 6.4 Catalog APIs

#### List / Search Products
* **Method & URL**: `GET /api/ecommerce/products`
* **Auth Required**: No
* **Query Parameters**:
  * `page`: Page index (default: `1`)
  * `limit`: Items per page (default: `20`, max: `100`)
  * `search`: Keyword string (matches product name, code, or description)
  * `category`: Slug of the category (e.g. `electronics`)
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "products": [
      {
        "id": "cmqu1xwv00005ck7q9l0mz5df",
        "code": "ITEM-001",
        "name": "Premium Cotton T-Shirt",
        "slug": "premium-cotton-t-shirt",
        "salesPrice": 450,
        "featuredImage": "/images/tshirt.jpg",
        "images": ["/images/tshirt.jpg", "/images/tshirt_back.jpg"],
        "colors": ["Black", "White"],
        "sizes": ["M", "L", "XL"],
        "availableStock": 15,
        "outOfStock": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### Get Product Details
* **Method & URL**: `GET /api/ecommerce/products/[id]`
* **Auth Required**: No
* **URL Parameter**: `[id]` can be the product's CUID `id` or unique string `slug`.
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "product": {
      "id": "cmqu1xwv00005ck7q9l0mz5df",
      "code": "ITEM-001",
      "name": "Premium Cotton T-Shirt",
      "slug": "premium-cotton-t-shirt",
      "salesPrice": 450,
      "featuredImage": "/images/tshirt.jpg",
      "images": ["/images/tshirt.jpg"],
      "colors": ["Black"],
      "sizes": ["M", "L"],
      "isVatEnabled": true,
      "vatPercentage": 5,
      "trackInventory": true,
      "availableStock": 15,
      "outOfStock": false,
      "variants": [
        {
          "id": "variant-cuid-1",
          "sku": "TSHIRT-BLK-M",
          "size": "M",
          "color": "Black",
          "salesPrice": 450,
          "availableStock": 10,
          "outOfStock": false
        }
      ]
    }
  }
  ```

#### List Categories
* **Method & URL**: `GET /api/ecommerce/categories`
* **Auth Required**: No
* **Success Response (200)**: Returns an array of active categories, including `name` and URL `slug`.

---

### 6.5 Cart and Stock APIs

#### Validate Cart Items & Pricing
* **Method & URL**: `POST /api/ecommerce/cart/validate`
* **Auth Required**: No
* **Request Body**:
  ```json
  {
    "items": [
      {
        "itemId": "cmqu1xwv00005ck7q9l0mz5df",
        "variantId": "variant-cuid-1", // Pass null if item has no variants
        "quantity": 2
      }
    ]
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "isValid": true,
    "items": [
      {
        "itemId": "cmqu1xwv00005ck7q9l0mz5df",
        "variantId": "variant-cuid-1",
        "quantity": 2,
        "unitPrice": 450,
        "lineTotal": 900,
        "availableStock": 10,
        "isAvailable": true,
        "isPurchasable": true,
        "messages": []
      }
    ],
    "summary": {
      "subTotal": 900,
      "totalItems": 2
    }
  }
  ```
* **Frontend Notes**: If any item is unavailable (`isAvailable === false` or `isPurchasable === false`), `isValid` will be returned as `false`. The storefront **must** inspect the `isValid` key and disable checkouts if it is `false`.

#### Real-Time Stock Check
* **Method & URL**: `POST /api/ecommerce/stock/check`
* **Auth Required**: No
* **Request Body**: (Identical items array to cart validation).
* **Success Response (200)**: Returns the current `availableStock` and stock availability status for all requested items.

---

### 6.6 Coupon API

#### Validate Coupon
* **Method & URL**: `POST /api/ecommerce/coupons/validate`
* **Auth Required**: No (guest coupon validation is supported, per-client limits are validated if customer cookie is present)
* **Request Body**:
  ```json
  {
    "code": "SUM_2026",
    "items": [
      {
        "itemId": "cmqu1xwv00005ck7q9l0mz5df",
        "variantId": "variant-cuid-1",
        "quantity": 2
      }
    ]
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "valid": true,
    "coupon": {
      "id": "coupon-cuid",
      "code": "SUM_2026",
      "discountType": "percentage", // percentage or fixed
      "discountValue": 10
    },
    "discountAmount": 90, // Calculated discount based on cart items subtotal
    "subTotal": 900,
    "message": "Coupon applied successfully"
  }
  ```

---

### 6.7 Checkout API

#### Place Order
* **Method & URL**: `POST /api/ecommerce/checkout`
* **Auth Required**: Yes
* **Request Body**:
  ```json
  {
    "items": [
      {
        "itemId": "cmqu1xwv00005ck7q9l0mz5df",
        "variantId": "variant-cuid-1",
        "quantity": 2
      }
    ],
    "addressId": "cmr227a6t0001ckysqb0nuke2",
    "couponCode": "SUM_2026", // Optional
    "paymentMethod": "COD", // COD, BKASH, NAGAD, CARD, BANK, MANUAL
    "customerNote": "Leave package at the front desk" // Optional
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Order placed successfully",
    "order": {
      "id": "sale-cuid-12345",
      "saleNumber": "SAL-2026-0075",
      "status": "DRAFT",
      "orderType": "ECOM",
      "deliveryStatus": "PENDING",
      "paymentStatus": "UNPAID",
      "paymentMethod": "COD",
      "subTotal": 900,
      "discount": 90,
      "tax": 40.5, // 5% VAT calculated server-side on post-discount subtotal
      "deliveryCharge": 80, // Calculated dynamically based on city/district
      "grandTotal": 930.5, // 900 - 90 + 40.5 + 80 = 930.50
      "createdAt": "2026-07-01T13:00:40.249Z"
    }
  }
  ```

---

### 6.8 Customer Order history APIs

#### List Customer Orders
* **Method & URL**: `GET /api/ecommerce/orders`
* **Auth Required**: Yes
* **Query Parameters**:
  * `page` (default 1)
  * `limit` (default 20)
  * `status`: filter by order status (`DRAFT`, `COMPLETED`, `CANCELLED`)
  * `deliveryStatus`: filter by delivery status (`PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`)
  * `paymentStatus`: filter by payment status (`UNPAID`, `PAID`, `REFUNDED`)
* **Success Response (200)**: Returns paginated array of customer's e-commerce orders.

#### Get Order Details
* **Method & URL**: `GET /api/ecommerce/orders/[id]`
* **Auth Required**: Yes
* **Success Response (200)**: Returns order calculations, delivery address snapshot, coupon summary, and items list.

#### Cancel Order
* **Method & URL**: `POST /api/ecommerce/orders/[id]/cancel`
* **Auth Required**: Yes
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Order cancelled successfully",
    "order": {
      "id": "sale-cuid-12345",
      "saleNumber": "SAL-2026-0075",
      "status": "CANCELLED",
      "deliveryStatus": "CANCELLED"
    }
  }
  ```
* **Frontend Notes**: Customers can only cancel orders in `DRAFT` status and `PENDING` or `PROCESSING` deliveryStatus. The storefront cancel button must be hidden/disabled if status is completed, shipped, or delivered.

---

## 7. Checkout Lifecycle

```
[Storefront Cart Selection]
            │
            ▼
[Cart Validation Call] ──► (Backend checks database prices and stock availability)
            │
            ▼
[Address Selection] ──► (Customer selects default address or creates one)
            │
            ▼
[Place Checkout Request] 
            │
            ▼
[Create Sale (Draft / ECOM)] ──► (Backend increments Stock.reservedQuantity)
            │
            ▼
[Admin Order Review] 
      ├──► [Cancel Order] ──► (Releases Stock.reservedQuantity, sets Sale CANCELLED)
      └──► [Complete Order] ──► (Deducts Stock.quantity, releases reservedQuantity, posts Accounting Voucher)
```

---

## 8. Stock Behavior

The ERP separates physical inventory quantities from reserved e-commerce stocks to prevent overselling while draft checkouts are pending verification.

* **Checkout**: Physical stock (`Stock.quantity`) is **not** decremented. Instead, e-commerce checkout increments `Stock.reservedQuantity` inside a postgres transaction.
* **Customer/Admin Cancellation**: Decrements `Stock.reservedQuantity` to release the locked allocation back to public pools. Physical stock remains unchanged.
* **Admin Completion**: Decrements physical stock and releases reservation:
  * `Stock.quantity = Stock.quantity - saleItem.quantity`
  * `Stock.reservedQuantity = Stock.reservedQuantity - saleItem.quantity`
  * Logs a `StockLedger` OUT transaction.

---

## 9. Accounting Behavior

Accounting ledger transactions are deferred until admin verification:

* **Checkout & Cancellation**: No accounting voucher or ledger entries are recorded.
* **Admin Completion**: Generates and posts standard ERP accounting vouchers:
  * **Debit**: Cash/Bank (if paid) or Accounts Receivable (if COD/unpaid).
  * **Credit**: Sales Revenue.
  * **Debit**: Cost of Goods Sold (COGS).
  * **Credit**: Finished Goods Inventory.
  * **Credit**: VAT Payable Ledger.

---

## 10. Security Rules for Frontend Developers

1. **Token Protection**: Do **not** store JWT tokens, authentication state strings, or user credentials in `localStorage` or `sessionStorage` (vulnerable to XSS). Depend entirely on browser cookie storage parameters.
2. **Propagate Sessions**: Ensure `credentials: "include"` is set on **every** network request.
3. **No Pricing Math**: Do not calculate subtotal discounts, taxes, or delivery charges on the client. Always present calculations retrieved directly from the backend.
4. **Checkout Block**: Disable the checkout button if `cart/validate` returns `isValid: false`.
5. **Enforce CORS**: The backend rejects storefront request origins if they are not explicitly whitelisted in the ERP server CORS config.
6. **No Admin Expose**: Never expose internal ERP fields (such as `costPrice`, internal ledger keys, admin creator CUIDs) on the storefront.
7. **Action Guards**: Do not render the "Cancel" button for orders whose status is `COMPLETED`, `CANCELLED`, or whose deliveryStatus is `SHIPPED`, `DELIVERED`, or `RETURNED`.

---

## 11. Frontend Integration Checklist

* [ ] Add environment variable `NEXT_PUBLIC_ECOMMERCE_API_URL` targeting backend domain.
* [ ] Configure HTTP client helper carrying `credentials: "include"`.
* [ ] Add global `401 Unauthorized` response interceptor to redirect to login.
* [ ] Integrate register, login, logout, and me handlers.
* [ ] Integrate address management pages (create, list, delete, set default).
* [ ] Integrate catalog listing, pagination, and category sidebar filter feeds.
* [ ] Hook up details display showing colors, sizes, and active variant lists.
* [ ] Implement cart validating helper. Enable guard checks before placing checkout requests.
* [ ] Integrate coupon applying input field.
* [ ] Implement checkout submission payload containing address CUID and cart items array.
* [ ] Build orders list and detail views.
* [ ] Implement order cancel action (restricting trigger strictly to draft/pending checkouts).

---

## 12. Example Frontend Service Functions

The following code snippets are designed for storefront services:

```ts
// types.ts
export interface CartItemInput {
  itemId: string;
  variantId: string | null;
  quantity: number;
}

export interface CheckoutPayload {
  items: CartItemInput[];
  addressId: string;
  couponCode?: string;
  paymentMethod: string;
  customerNote?: string;
}

// services/api.ts
import { ecommerceFetch } from "./client";

export const storefrontAuthApi = {
  login: (phone: string, password: string) =>
    ecommerceFetch("/api/ecommerce/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),

  getProfile: () =>
    ecommerceFetch("/api/ecommerce/auth/me"),

  logout: () =>
    ecommerceFetch("/api/ecommerce/auth/logout", {
      method: "POST",
    }),
};

export const storefrontCartApi = {
  validate: (items: CartItemInput[]) =>
    ecommerceFetch("/api/ecommerce/cart/validate", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  validateCoupon: (code: string, items: CartItemInput[]) =>
    ecommerceFetch("/api/ecommerce/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, items }),
    }),
};

export const storefrontCheckoutApi = {
  placeOrder: (payload: CheckoutPayload) =>
    ecommerceFetch("/api/ecommerce/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
```

---

## 13. Staging Connection Notes

* **HTTPS Requirement**: Modern browsers do not transmit `HttpOnly` cookie tokens if the request is not sent over encrypted HTTPS protocols (except when testing on `localhost`). Ensure both storefront staging and ERP API staging domains run valid SSL certificates.
* **Wildcard Domain Cookies**: If storefront lives on `store.staging.example.com` and ERP lives on `api.staging.example.com`, ensure the backend cookies are issued with `Domain=.example.com` to enable cross-subdomain authentication.

### Staging Verification Sequence
1. Navigate to storefront. Register customer and log in.
2. Refresh page. Confirm session is preserved and user info loads.
3. Add a test shipping address.
4. Add items to cart. Apply a valid staging coupon (e.g. `SUM_2026`).
5. Place checkout order.
6. Verify the order status is `DRAFT` in customer account history.
7. Log in to ERP admin dashboard. Select the order, configure shipping courier, and click **Confirm & Complete**.
8. Return to storefront. Verify order status has changed to `COMPLETED` and cancellation buttons are disabled.

---

## Final Integration Rule:
The frontend storefront collects customer intent and renders data. The FF-ERP backend remains the absolute authority and sole calculator for all trusted business operations, including price, stock audits, tax/VAT calculations, shipping fees, coupon logic, stock reservations, ledger logging, and accounting vouchers.
