/**
 * Storefront E-commerce API Client Service Layer
 * 
 * This service handles communication with the FF-ERP e-commerce backend.
 * It enforces request/response structures, credentials propagation, and handles auth status codes.
 */

const API_URL = process.env.NEXT_PUBLIC_ECOMMERCE_API_URL || "/api/ecommerce";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

// Global fetch helper
async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;
  
  // Set default headers
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // Crucial for HttpOnly cookies session propagation
    credentials: "include", 
  };

  try {
    const response = await fetch(url, fetchOptions);
    let result: ApiResponse<T>;

    try {
      result = await response.json();
    } catch (_) {
      result = {
        success: false,
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    // Handle Global 401 Unauthorized redirect
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        // Redirect customer to login page
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
      }
      return {
        success: false,
        message: "Session expired. Please login again.",
        error: "UNAUTHORIZED",
      };
    }

    if (!response.ok) {
      return {
        ...result,
        success: false,
        message: result.message || "Something went wrong",
        error: result.error || "HTTP_ERROR",
      };
    }

    return result;
  } catch (err) {
    console.error(`API Request to ${url} failed:`, err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed",
      error: "CONNECTION_FAILED",
    };
  }
}

// --- API CLIENT METHODS ---

export const StorefrontClient = {
  // 1. Authentication
  auth: {
    async register(payload: {
      phone: string;
      password: string;
      name: string;
      email?: string;
    }) {
      return apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async login(payload: { phone: string; password: string }) {
      return apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async logout() {
      return apiRequest("/auth/logout", {
        method: "POST",
      });
    },

    async getProfile() {
      return apiRequest("/client/profile");
    },

    async updateProfile(payload: { name?: string; email?: string }) {
      return apiRequest("/client/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    async changePassword(payload: { oldPassword: string; newPassword: string }) {
      return apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // 2. Shipping Addresses
  addresses: {
    async list() {
      return apiRequest("/client/addresses");
    },

    async get(id: string) {
      return apiRequest(`/client/addresses/${id}`);
    },

    async create(payload: {
      recipientName: string;
      phone: string;
      addressLine: string;
      area?: string;
      city: string;
      district: string;
      division: string;
      country: string;
      isDefault?: boolean;
    }) {
      return apiRequest("/client/addresses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async update(
      id: string,
      payload: Partial<{
        recipientName: string;
        phone: string;
        addressLine: string;
        area: string;
        city: string;
        district: string;
        division: string;
        country: string;
      }>
    ) {
      return apiRequest(`/client/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    async delete(id: string) {
      return apiRequest(`/client/addresses/${id}`, {
        method: "DELETE",
      });
    },

    async setDefault(id: string) {
      return apiRequest(`/client/addresses/${id}/default`, {
        method: "PATCH",
      });
    },
  },

  // 3. Catalog Data
  catalog: {
    async getProducts(params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
    } = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append("page", String(params.page));
      if (params.limit) query.append("limit", String(params.limit));
      if (params.search) query.append("search", params.search);
      if (params.category) query.append("category", params.category);
      
      const queryString = query.toString();
      return apiRequest(`/products${queryString ? `?${queryString}` : ""}`);
    },

    async getProduct(id: string) {
      return apiRequest(`/products/${id}`);
    },

    async searchProducts(query: string) {
      return apiRequest(`/products/search?q=${encodeURIComponent(query)}`);
    },

    async getCategories() {
      return apiRequest("/categories");
    },

    async getCategory(id: string) {
      return apiRequest(`/categories/${id}`);
    },

    async getCategoryProducts(id: string, params: { page?: number; limit?: number } = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append("page", String(params.page));
      if (params.limit) query.append("limit", String(params.limit));
      
      const queryString = query.toString();
      return apiRequest(`/categories/${id}/products${queryString ? `?${queryString}` : ""}`);
    },

    async getUnits() {
      return apiRequest("/units");
    },
  },

  // 4. Cart and coupon validation
  cart: {
    async validate(items: Array<{ itemId: string; variantId: string | null; quantity: number }>) {
      return apiRequest("/cart/validate", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
    },

    async checkStock(items: Array<{ itemId: string; variantId: string | null; quantity: number }>) {
      return apiRequest("/stock/check", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
    },

    async validateCoupon(code: string, items: Array<{ itemId: string; variantId: string | null; quantity: number }>) {
      return apiRequest("/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code, items }),
      });
    },
  },

  // 5. Checkout
  checkout: {
    async placeOrder(payload: {
      items: Array<{ itemId: string; variantId: string | null; quantity: number }>;
      addressId: string;
      couponCode?: string;
      paymentMethod: string;
      paymentStatus?: string;
      paymentReference?: string;
      customerNote?: string;
    }) {
      return apiRequest("/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // 6. Orders History & Customer Management
  orders: {
    async list(params: {
      page?: number;
      limit?: number;
      status?: string;
      deliveryStatus?: string;
      paymentStatus?: string;
      fromDate?: string;
      toDate?: string;
    } = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append("page", String(params.page));
      if (params.limit) query.append("limit", String(params.limit));
      if (params.status) query.append("status", params.status);
      if (params.deliveryStatus) query.append("deliveryStatus", params.deliveryStatus);
      if (params.paymentStatus) query.append("paymentStatus", params.paymentStatus);
      if (params.fromDate) query.append("fromDate", params.fromDate);
      if (params.toDate) query.append("toDate", params.toDate);

      const queryString = query.toString();
      return apiRequest(`/orders${queryString ? `?${queryString}` : ""}`);
    },

    async get(id: string) {
      return apiRequest(`/orders/${id}`);
    },

    async cancel(id: string) {
      return apiRequest(`/orders/${id}/cancel`, {
        method: "POST",
      });
    },
  },
};
