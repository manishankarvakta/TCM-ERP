import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Note: This is a simplified type - adjust based on your actual Quotation type
interface QuotationItem {
  id?: string;
  sl: number;
  code?: string | null;
  description?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  unit?: string | null;
  unitPrice: number;
  quantity: number;
  amount: number;
  sortOrder: number;
  itemId?: string | null;
}

interface Section {
  id?: string;
  title: string;
  note?: string;
  total?: number;
  grandTotal?: number;
  discount?: number;
  sortOrder: number;
  categoryId?: string;
  items: QuotationItem[];
  groups: ItemGroup[];
}

interface ItemGroup {
  id?: string;
  code?: string;
  description: string;
  quantity?: number;
  number?: number;
  sortOrder: number;
  items: QuotationItem[];
  moduleGroupId?: string | null; // Reference to ModuleGroup template
}

interface Quotation {
  id?: string;
  quotationNumber: string;
  subject: string;
  discount?: number;
  grandTotal?: number;
  date: Date | string;
  coverLetter?: string | null;
  financialStatement?: string | null;
  tos?: string | null;
  total?: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVISED';
  clientId?: string;
  organizationId?: string;
  submittedById?: string;
  shippingCharges?: number;
  vatIncluded?: boolean;
  projectLocation?: string;
  section?: Section[];
}

interface QuotationState {
  currentQuotation: Quotation | null;
  isEditing: boolean;
}

const initialState: QuotationState = {
  currentQuotation: null,
  isEditing: false,
};

// Helper function to recalculate section totals
const recalculateSectionTotals = (state: QuotationState, sectionIndex: number) => {
  if (!state.currentQuotation?.section) return;
  const section = state.currentQuotation.section[sectionIndex];
  if (!section) return;
  
  let sectionTotal = 0;
  
  // Sum direct items
  if (section.items) {
    section.items.forEach((item: QuotationItem) => {
      sectionTotal += item.amount || 0;
    });
  }
  
  // Sum items in groups
  if (section.groups) {
    section.groups.forEach((group: ItemGroup) => {
      if (group.items) {
        group.items.forEach((item: QuotationItem) => {
          sectionTotal += item.amount || 0;
        });
      }
    });
  }
  
  // Calculate grandTotal = total - discount
  const discount = section.discount || 0;
  const grandTotal = Math.max(0, sectionTotal - discount);
  
  section.total = sectionTotal;
  section.grandTotal = grandTotal;
};

const quotationSlice = createSlice({
  name: 'quotation',
  initialState,
  reducers: {
    setCurrentQuotation: (state, action: PayloadAction<Quotation | null>) => {
      state.currentQuotation = action.payload;
    },
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },
    updateQuotationField: (state, action: PayloadAction<{ field: keyof Quotation; value: any }>) => {
      if (!state.currentQuotation) {
        state.currentQuotation = {} as Quotation;
      }
      const { field, value } = action.payload;
      (state.currentQuotation as any)[field] = value;
    },
    updateSections: (state, action: PayloadAction<Section[]>) => {
      if (!state.currentQuotation) {
        state.currentQuotation = {} as Quotation;
      }
      // Calculate totals for each section
      const sectionsWithTotals = action.payload.map((section: Section) => {
        let sectionTotal = 0;
        
        // Sum direct items
        if (section.items) {
          section.items.forEach((item: QuotationItem) => {
            sectionTotal += item.amount || 0;
          });
        }
        
        // Sum items in groups
        if (section.groups) {
          section.groups.forEach((group: ItemGroup) => {
            if (group.items) {
              group.items.forEach((item: QuotationItem) => {
                sectionTotal += item.amount || 0;
              });
            }
          });
        }
        
        // Calculate grandTotal = total - discount
        const discount = section.discount || 0;
        const grandTotal = Math.max(0, sectionTotal - discount);
        
        return {
          ...section,
          total: sectionTotal,
          grandTotal: grandTotal,
        };
      });
      
      state.currentQuotation.section = sectionsWithTotals;
    },
    addItem: (state, action: PayloadAction<{ sectionIndex: number; item: QuotationItem; groupIndex?: number }>) => {
      if (!state.currentQuotation?.section) return;
      const { sectionIndex, item, groupIndex } = action.payload;
      
      if (groupIndex !== undefined) {
        // Add to group
        const group = state.currentQuotation.section[sectionIndex]?.groups?.[groupIndex];
        if (group) {
          if (!group.items) group.items = [];
          group.items.push(item);
        }
      } else {
        // Add directly to section
        const section = state.currentQuotation.section[sectionIndex];
        if (section) {
          if (!section.items) section.items = [];
          section.items.push(item);
        }
      }
      // Recalculate section totals after adding item
      recalculateSectionTotals(state, sectionIndex);
    },
    updateItem: (state, action: PayloadAction<{ sectionIndex: number; itemIndex: number; item: Partial<QuotationItem>; groupIndex?: number }>) => {
      if (!state.currentQuotation?.section) return;
      const { sectionIndex, itemIndex, item, groupIndex } = action.payload;
      
      if (groupIndex !== undefined) {
        const group = state.currentQuotation.section[sectionIndex]?.groups?.[groupIndex];
        if (group?.items?.[itemIndex]) {
          group.items[itemIndex] = { ...group.items[itemIndex], ...item };
        }
      } else {
        const section = state.currentQuotation.section[sectionIndex];
        if (section?.items?.[itemIndex]) {
          section.items[itemIndex] = { ...section.items[itemIndex], ...item };
        }
      }
      // Recalculate section totals after item update
      recalculateSectionTotals(state, sectionIndex);
    },
    removeItem: (state, action: PayloadAction<{ sectionIndex: number; itemIndex: number; groupIndex?: number }>) => {
      if (!state.currentQuotation?.section) return;
      const { sectionIndex, itemIndex, groupIndex } = action.payload;
      
      if (groupIndex !== undefined) {
        const group = state.currentQuotation.section[sectionIndex]?.groups?.[groupIndex];
        if (group?.items) {
          group.items.splice(itemIndex, 1);
        }
      } else {
        const section = state.currentQuotation.section[sectionIndex];
        if (section?.items) {
          section.items.splice(itemIndex, 1);
        }
      }
      // Recalculate section totals after item removal
      recalculateSectionTotals(state, sectionIndex);
    },
    updateSectionNote: (state, action: PayloadAction<{ sectionIndex: number; note: string }>) => {
      if (!state.currentQuotation?.section) return;
      const { sectionIndex, note } = action.payload;
      const section = state.currentQuotation.section[sectionIndex];
      if (section) {
        section.note = note;
        // Recalculate section totals
        recalculateSectionTotals(state, sectionIndex);
      }
    },
    updateSectionDiscount: (state, action: PayloadAction<{ sectionIndex: number; discount: number | undefined }>) => {
      if (!state.currentQuotation?.section) return;
      const { sectionIndex, discount } = action.payload;
      const section = state.currentQuotation.section[sectionIndex];
      if (section) {
        section.discount = discount;
        // Recalculate section totals
        recalculateSectionTotals(state, sectionIndex);
      }
    },
    calculateGrandTotal: (state) => {
      if (!state.currentQuotation?.section) return;
      
      // First, recalculate totals for all sections to ensure they're up to date
      state.currentQuotation.section.forEach((_section: Section, index: number) => {
        recalculateSectionTotals(state, index);
      });
      
      // Sum up all section grandTotals
      let quotationTotal = 0;
      state.currentQuotation.section.forEach((section: Section) => {
        quotationTotal += section.grandTotal || 0;
      });
      
      if (state.currentQuotation) {
        state.currentQuotation.total = quotationTotal;
      }
    },
  },
});

export const {
  setCurrentQuotation,
  setIsEditing,
  updateQuotationField,
  updateSections,
  updateSectionNote,
  updateSectionDiscount,
  addItem,
  updateItem,
  removeItem,
  calculateGrandTotal,
} = quotationSlice.actions;

// Persist configuration for quotation slice
const quotationPersistConfig = {
  key: 'quotation',
  storage,
  whitelist: ['currentQuotation', 'isEditing'], // Only persist these fields
};

// Export persisted reducer
export default persistReducer(quotationPersistConfig, quotationSlice.reducer);

