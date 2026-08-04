import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Item in the purchase
export interface PurchaseItem {
  itemId: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Purchase form state
export interface PurchaseState {
  items: PurchaseItem[];
  discount: number;
  tax: number;
  subTotal: number;
  grandTotal: number;
}

const initialState: PurchaseState = {
  items: [
    {
      itemId: '',
      variantId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    },
  ],
  discount: 0,
  tax: 0,
  subTotal: 0,
  grandTotal: 0,
};

// Helper function to calculate amount
const calculateAmount = (quantity: number, unitPrice: number): number => {
  const amount = Number(quantity) * Number(unitPrice);
  return Number.isFinite(amount) ? amount : 0;
};

// Helper function to calculate subtotal
const calculateSubTotal = (items: PurchaseItem[]): number => {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
};

// Helper function to calculate grand total
const calculateGrandTotal = (subTotal: number, discount: number, tax: number): number => {
  return subTotal - Number(discount || 0) + Number(tax || 0);
};

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState,
  reducers: {
    // Set item at specific index
    setItem: (state, action: PayloadAction<{ index: number; itemId: string; variantId?: string; description: string; unitPrice: number }>) => {
      const { index, itemId, variantId, description, unitPrice } = action.payload;
      if (state.items[index]) {
        state.items[index].itemId = itemId;
        state.items[index].variantId = variantId || '';
        state.items[index].description = description;
        state.items[index].unitPrice = unitPrice;
        // Recalculate amount for this item
        state.items[index].amount = calculateAmount(state.items[index].quantity, unitPrice);
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Update quantity for an item
    setQuantity: (state, action: PayloadAction<{ index: number; quantity: number }>) => {
      const { index, quantity } = action.payload;
      if (state.items[index]) {
        state.items[index].quantity = quantity;
        // Recalculate amount for this item
        state.items[index].amount = calculateAmount(quantity, state.items[index].unitPrice);
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Update unit price for an item
    setUnitPrice: (state, action: PayloadAction<{ index: number; unitPrice: number }>) => {
      const { index, unitPrice } = action.payload;
      if (state.items[index]) {
        state.items[index].unitPrice = unitPrice;
        // Recalculate amount for this item
        state.items[index].amount = calculateAmount(state.items[index].quantity, unitPrice);
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Update description for an item
    setDescription: (state, action: PayloadAction<{ index: number; description: string }>) => {
      const { index, description } = action.payload;
      if (state.items[index]) {
        state.items[index].description = description;
      }
    },

    // Add new item
    addItem: (state) => {
      state.items.push({
        itemId: '',
        variantId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      });
    },

    // Prepend new item
    prependItem: (state) => {
      state.items.unshift({
        itemId: '',
        variantId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      });
    },

    // Remove item
    removeItem: (state, action: PayloadAction<number>) => {
      if (state.items.length > 1) {
        state.items.splice(action.payload, 1);
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Set discount
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
      // Recalculate grand total
      state.grandTotal = calculateGrandTotal(state.subTotal, action.payload, state.tax);
    },

    // Set tax
    setTax: (state, action: PayloadAction<number>) => {
      state.tax = action.payload;
      // Recalculate grand total
      state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, action.payload);
    },

    // Reset form
    resetPurchase: (state) => {
      state.items = initialState.items;
      state.discount = 0;
      state.tax = 0;
      state.subTotal = 0;
      state.grandTotal = 0;
    },

    // Initialize with data (for edit mode)
    initializePurchase: (state, action: PayloadAction<Partial<PurchaseState>>) => {
      const { items, discount, tax } = action.payload;
      if (items) state.items = items;
      if (discount !== undefined) state.discount = discount;
      if (tax !== undefined) state.tax = tax;
      // Recalculate totals
      state.subTotal = calculateSubTotal(state.items);
      state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
    },
  },
});

export const {
  setItem,
  setQuantity,
  setUnitPrice,
  setDescription,
  addItem,
  prependItem,
  removeItem,
  setDiscount,
  setTax,
  resetPurchase,
  initializePurchase,
} = purchaseSlice.actions;

export default purchaseSlice.reducer;
