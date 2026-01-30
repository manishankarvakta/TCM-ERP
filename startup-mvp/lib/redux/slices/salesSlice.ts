import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Item in the sale
export interface SaleItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Sale form state
export interface SaleState {
  clientId: string;
  warehouseId: string;
  date: string; // ISO Date string
  status: string;
  notes: string;
  
  items: SaleItem[];
  discount: number;
  tax: number;
  autoTaxEnabled: boolean;
  
  subTotal: number;
  grandTotal: number;
}

const initialState: SaleState = {
  clientId: '',
  warehouseId: '',
  date: new Date().toISOString(),
  status: 'DRAFT',
  notes: '',
  
  items: [
    {
      itemId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    },
  ],
  discount: 0,
  tax: 0,
  autoTaxEnabled: false,
  
  subTotal: 0,
  grandTotal: 0,
};

// Helper function to calculate amount
const calculateAmount = (quantity: number, unitPrice: number): number => {
  const amount = Number(quantity) * Number(unitPrice);
  return Number.isFinite(amount) ? amount : 0;
};

// Helper function to calculate subtotal
const calculateSubTotal = (items: SaleItem[]): number => {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
};

// Helper function to calculate grand total
const calculateGrandTotal = (subTotal: number, discount: number, tax: number): number => {
  return subTotal - Number(discount || 0) + Number(tax || 0);
};

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    // Set form metadata
    setSaleMetadata: (state, action: PayloadAction<Partial<SaleState>>) => {
      const { clientId, warehouseId, date, status, notes } = action.payload;
      if (clientId !== undefined) state.clientId = clientId;
      if (warehouseId !== undefined) state.warehouseId = warehouseId;
      if (date !== undefined) state.date = date;
      if (status !== undefined) state.status = status;
      if (notes !== undefined) state.notes = notes;
    },

    // Set item at specific index
    setSaleItem: (state, action: PayloadAction<{ index: number; itemId: string; description: string; unitPrice: number }>) => {
      const { index, itemId, description, unitPrice } = action.payload;
      if (state.items[index]) {
        state.items[index].itemId = itemId;
        state.items[index].description = description;
        state.items[index].unitPrice = unitPrice;
        // Recalculate amount for this item
        state.items[index].amount = calculateAmount(state.items[index].quantity, unitPrice);
        
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        if (state.autoTaxEnabled) {
          state.tax = state.subTotal * 0.15;
        }
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Update quantity for an item
    setSaleItemQuantity: (state, action: PayloadAction<{ index: number; quantity: number }>) => {
      const { index, quantity } = action.payload;
      if (state.items[index]) {
        state.items[index].quantity = quantity;
        // Recalculate amount for this item
        state.items[index].amount = calculateAmount(quantity, state.items[index].unitPrice);
        
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        if (state.autoTaxEnabled) {
          state.tax = state.subTotal * 0.15;
        }
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Update unit price for an item
    setSaleItemUnitPrice: (state, action: PayloadAction<{ index: number; unitPrice: number }>) => {
      const { index, unitPrice } = action.payload;
      if (state.items[index]) {
        state.items[index].unitPrice = unitPrice;
        // Recalculate amount for this item
        state.items[index].amount = calculateAmount(state.items[index].quantity, unitPrice);
        
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        if (state.autoTaxEnabled) {
          state.tax = state.subTotal * 0.15;
        }
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Update description for an item
    setSaleItemDescription: (state, action: PayloadAction<{ index: number; description: string }>) => {
      const { index, description } = action.payload;
      if (state.items[index]) {
        state.items[index].description = description;
      }
    },

    // Add new item
    addSaleItem: (state) => {
      state.items.push({
        itemId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      });
    },

    // Remove item
    removeSaleItem: (state, action: PayloadAction<number>) => {
      if (state.items.length > 1) {
        state.items.splice(action.payload, 1);
        // Recalculate totals
        state.subTotal = calculateSubTotal(state.items);
        if (state.autoTaxEnabled) {
          state.tax = state.subTotal * 0.15;
        }
        state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
      }
    },

    // Set discount
    setSaleDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
      // Recalculate grand total
      state.grandTotal = calculateGrandTotal(state.subTotal, action.payload, state.tax);
    },

    // Set tax manually (disables auto tax)
    setSaleTax: (state, action: PayloadAction<number>) => {
      state.tax = action.payload;
      state.autoTaxEnabled = false; // Disable auto tax on manual edit
      // Recalculate grand total
      state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, action.payload);
    },

    // Toggle auto tax
    toggleSaleAutoTax: (state, action: PayloadAction<boolean>) => {
      state.autoTaxEnabled = action.payload;
      if (action.payload) {
        // Enable auto tax: Calculate 15%
        state.tax = state.subTotal * 0.15;
      } else {
        // Disable auto tax: Reset to 0 (optional, or keep current)
        state.tax = 0;
      }
      state.grandTotal = calculateGrandTotal(state.subTotal, state.discount, state.tax);
    },

    // Reset form
    resetSale: (state) => {
      return initialState;
    },

    // Initialize with data (for edit mode)
    initializeSale: (state, action: PayloadAction<Partial<SaleState>>) => {
      return { ...initialState, ...action.payload };
    },
  },
});

export const {
  setSaleMetadata,
  setSaleItem,
  setSaleItemQuantity,
  setSaleItemUnitPrice,
  setSaleItemDescription,
  addSaleItem,
  removeSaleItem,
  setSaleDiscount,
  setSaleTax,
  toggleSaleAutoTax,
  resetSale,
  initializeSale,
} = salesSlice.actions;

export default salesSlice.reducer;
