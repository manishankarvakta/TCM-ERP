import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Note: This is a simplified type - adjust based on your actual Quotation type
interface QuotationItem {
  id?: string;
  sl: number;
  no?: number | null;
  code?: string | null;
  description?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  unit?: string | null;
  unitPrice: number;
  quantity: number;
  discount?: number | null;
  amount: number;
  sortOrder: number;
  itemId?: string | null;
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

interface CategoryGroup {
  id?: string;
  categoryId?: string;
  sortOrder: number;
  items: QuotationItem[];
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
  categoryGroups?: CategoryGroup[];
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

// Helper function to check if sections are deeply equal
const areSectionsEqual = (sections1: Section[], sections2: Section[]): boolean => {
  if (sections1.length !== sections2.length) return false;
  
  for (let i = 0; i < sections1.length; i++) {
    const s1 = sections1[i];
    const s2 = sections2[i];
    
    // Compare basic properties
    if (s1.id !== s2.id || 
        s1.title !== s2.title || 
        s1.total !== s2.total || 
        s1.grandTotal !== s2.grandTotal ||
        s1.discount !== s2.discount) {
      return false;
    }
    
    // Compare items length
    if ((s1.items?.length || 0) !== (s2.items?.length || 0)) return false;
    if ((s1.groups?.length || 0) !== (s2.groups?.length || 0)) return false;
    if ((s1.categoryGroups?.length || 0) !== (s2.categoryGroups?.length || 0)) return false;
    
    // Compare groups
    if (s1.groups && s2.groups) {
      for (let j = 0; j < s1.groups.length; j++) {
        const g1 = s1.groups[j];
        const g2 = s2.groups[j];
        if (g1.id !== g2.id || 
            (g1.items?.length || 0) !== (g2.items?.length || 0)) {
          return false;
        }
      }
    }
  }
  
  return true;
};

// Helper function to recalculate section totals
const recalculateSectionTotals = (state: QuotationState, sectionIndex: number) => {
  if (!state.currentQuotation?.section) return;
  const section = state.currentQuotation.section[sectionIndex];
  if (!section) return;
  
  // Calculate module group total (sum of all groups' items)
  let moduleGroupTotal = 0;
  if (section.groups) {
    section.groups.forEach((group: ItemGroup) => {
      if (group.items) {
        group.items.forEach((item: QuotationItem) => {
          moduleGroupTotal += item.amount || 0;
        });
      }
    });
  }
  
  // Calculate items category total (sum of all categoryGroups' items)
  let itemsCategoryTotal = 0;
  if (section.categoryGroups) {
    section.categoryGroups.forEach((categoryGroup: CategoryGroup) => {
      if (categoryGroup.items) {
        categoryGroup.items.forEach((item: QuotationItem) => {
          itemsCategoryTotal += item.amount || 0;
        });
      }
    });
  }
  
  // Calculate items total (sum of direct items)
  let itemsTotal = 0;
  if (section.items) {
    section.items.forEach((item: QuotationItem) => {
      itemsTotal += item.amount || 0;
    });
  }
  
  // Section total = module group total + items category total + items total
  const sectionTotal = moduleGroupTotal + itemsCategoryTotal + itemsTotal;
  
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
      const currentValue = (state.currentQuotation as any)[field];
      
      // Only update if value actually changed (prevents unnecessary state updates)
      // Use deep equality for objects/arrays, shallow for primitives
      if (currentValue !== value) {
        // For objects/arrays, do a shallow comparison
        if (typeof value === 'object' && value !== null && typeof currentValue === 'object' && currentValue !== null) {
          // If both are objects, check if they're the same reference or have different keys/values
          const valueKeys = Object.keys(value);
          const currentKeys = Object.keys(currentValue);
          if (valueKeys.length !== currentKeys.length) {
            (state.currentQuotation as any)[field] = value;
          } else {
            // Check if any values differ
            const hasChanged = valueKeys.some(key => value[key] !== currentValue[key]);
            if (hasChanged) {
              (state.currentQuotation as any)[field] = value;
            }
          }
        } else {
          // For primitives or null/undefined, simple comparison is enough
          (state.currentQuotation as any)[field] = value;
        }
      }
    },
    updateSections: (state, action: PayloadAction<Section[]>) => {
      if (!state.currentQuotation) {
        state.currentQuotation = {} as Quotation;
      }
      
      // Calculate totals for each section
      const sectionsWithTotals = action.payload.map((section: Section) => {
        // Calculate module group total (sum of all groups' items)
        let moduleGroupTotal = 0;
        if (section.groups) {
          section.groups.forEach((group: ItemGroup) => {
            if (group.items) {
              group.items.forEach((item: QuotationItem) => {
                moduleGroupTotal += item.amount || 0;
              });
            }
          });
        }
        
        // Calculate items category total (sum of all categoryGroups' items)
        let itemsCategoryTotal = 0;
        if (section.categoryGroups) {
          section.categoryGroups.forEach((categoryGroup: CategoryGroup) => {
            if (categoryGroup.items) {
              categoryGroup.items.forEach((item: QuotationItem) => {
                itemsCategoryTotal += item.amount || 0;
              });
            }
          });
        }
        
        // Calculate items total (sum of direct items)
        let itemsTotal = 0;
        if (section.items) {
          section.items.forEach((item: QuotationItem) => {
            itemsTotal += item.amount || 0;
          });
        }
        
        // Section total = module group total + items category total + items total
        const sectionTotal = moduleGroupTotal + itemsCategoryTotal + itemsTotal;
        
        // Calculate grandTotal = total - discount
        const discount = section.discount || 0;
        const grandTotal = Math.max(0, sectionTotal - discount);
        
        return {
          ...section,
          total: sectionTotal,
          grandTotal: grandTotal,
        };
      });
      
      // Only update if sections actually changed (deep equality check)
      const currentSections = state.currentQuotation.section || [];
      if (!areSectionsEqual(currentSections, sectionsWithTotals)) {
        state.currentQuotation.section = sectionsWithTotals;
      }
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



