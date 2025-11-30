import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Note: This is a simplified type - adjust based on your actual Quotation type
interface QuotationItem {
  id?: string;
  sl: number;
  code?: string | null;
  description?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  unitPrice: number;
  quantity: number;
  amount: number;
  note?: string | null;
  sortOrder: number;
  itemId?: string | null;
}

interface Component {
  id?: string;
  type: string;
  data: any;
}

interface Quotation {
  id?: string;
  quotationNumber: string;
  subject: string;
  submittedTo: string;
  date: Date | string;
  coverLetter?: string | null;
  financialStatement?: string | null;
  tos?: string | null;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVISED';
  clientId?: string;
  submittedById?: string;
  sections?: any[];
}

interface QuotationState {
  currentQuotation: Quotation | null;
  isEditing: boolean;
}

const initialState: QuotationState = {
  currentQuotation: null,
  isEditing: false,
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
    addItem: (state, action: PayloadAction<{ sectionIndex: number; item: QuotationItem; groupIndex?: number }>) => {
      if (!state.currentQuotation?.sections) return;
      const { sectionIndex, item, groupIndex } = action.payload;
      
      if (groupIndex !== undefined) {
        // Add to group
        const group = state.currentQuotation.sections[sectionIndex]?.groups?.[groupIndex];
        if (group) {
          if (!group.items) group.items = [];
          group.items.push(item);
        }
      } else {
        // Add directly to section
        const section = state.currentQuotation.sections[sectionIndex];
        if (section) {
          if (!section.items) section.items = [];
          section.items.push(item);
        }
      }
    },
    updateItem: (state, action: PayloadAction<{ sectionIndex: number; itemIndex: number; item: Partial<QuotationItem>; groupIndex?: number }>) => {
      if (!state.currentQuotation?.sections) return;
      const { sectionIndex, itemIndex, item, groupIndex } = action.payload;
      
      if (groupIndex !== undefined) {
        const group = state.currentQuotation.sections[sectionIndex]?.groups?.[groupIndex];
        if (group?.items?.[itemIndex]) {
          group.items[itemIndex] = { ...group.items[itemIndex], ...item };
        }
      } else {
        const section = state.currentQuotation.sections[sectionIndex];
        if (section?.items?.[itemIndex]) {
          section.items[itemIndex] = { ...section.items[itemIndex], ...item };
        }
      }
    },
    removeItem: (state, action: PayloadAction<{ sectionIndex: number; itemIndex: number; groupIndex?: number }>) => {
      if (!state.currentQuotation?.sections) return;
      const { sectionIndex, itemIndex, groupIndex } = action.payload;
      
      if (groupIndex !== undefined) {
        const group = state.currentQuotation.sections[sectionIndex]?.groups?.[groupIndex];
        if (group?.items) {
          group.items.splice(itemIndex, 1);
        }
      } else {
        const section = state.currentQuotation.sections[sectionIndex];
        if (section?.items) {
          section.items.splice(itemIndex, 1);
        }
      }
    },
    addComponent: (state, action: PayloadAction<{ sectionIndex: number; itemIndex: number; component: Component; groupIndex?: number }>) => {
      if (!state.currentQuotation?.sections) return;
      const { sectionIndex, itemIndex, component, groupIndex } = action.payload;
      
      // This is a placeholder - adjust based on your component structure
      const targetItem = groupIndex !== undefined
        ? state.currentQuotation.sections[sectionIndex]?.groups?.[groupIndex]?.items?.[itemIndex]
        : state.currentQuotation.sections[sectionIndex]?.items?.[itemIndex];
      
      if (targetItem) {
        if (!targetItem.components) targetItem.components = [];
        targetItem.components.push(component);
      }
    },
    calculateGrandTotal: (state) => {
      if (!state.currentQuotation?.sections) return;
      
      let total = 0;
      
      state.currentQuotation.sections.forEach((section: any) => {
        let sectionTotal = 0;
        
        // Sum direct items
        if (section.items) {
          section.items.forEach((item: QuotationItem) => {
            sectionTotal += item.amount || 0;
          });
        }
        
        // Sum items in groups
        if (section.groups) {
          section.groups.forEach((group: any) => {
            if (group.items) {
              group.items.forEach((item: QuotationItem) => {
                sectionTotal += item.amount || 0;
              });
            }
          });
        }
        
        // Apply discount
        if (section.discount) {
          sectionTotal = sectionTotal * (1 - Number(section.discount) / 100);
        }
        
        total += sectionTotal;
      });
      
      if (state.currentQuotation) {
        state.currentQuotation.total = total;
      }
    },
  },
});

export const {
  setCurrentQuotation,
  setIsEditing,
  addItem,
  updateItem,
  removeItem,
  addComponent,
  calculateGrandTotal,
} = quotationSlice.actions;

export default quotationSlice.reducer;

