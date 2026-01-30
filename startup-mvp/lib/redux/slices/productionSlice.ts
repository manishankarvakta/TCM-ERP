import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types for the slice state
interface ProductionBOMItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  unitSymbol: string;
  quantityRequired: number;
  costPrice: number;
}

interface ProductionBOM {
  id: string;
  quantityPerUnit: number;
  items: ProductionBOMItem[];
}

interface ProductionMaterial {
  itemId: string;
  itemName: string;
  itemCode: string;
  unitSymbol: string;
  quantityRequired: number;
  quantityNeeded: number;
  costPrice: number;
}

export interface ProductionState {
  bomId: string | null;
  warehouseId: string | null;
  quantity: number;
  notes: string;
  selectedBOM: ProductionBOM | null;
  materials: ProductionMaterial[];
  totalCost: number;
}

const initialState: ProductionState = {
  bomId: null,
  warehouseId: null,
  quantity: 1,
  notes: '',
  selectedBOM: null,
  materials: [],
  totalCost: 0,
};

// Helper to calculate materials based on BOM and quantity
const calculateMaterials = (bom: ProductionBOM | null, quantity: number): { materials: ProductionMaterial[], totalCost: number } => {
  if (!bom || quantity <= 0) {
    return { materials: [], totalCost: 0 };
  }

  const materials = bom.items.map((item) => {
    const quantityNeeded = (item.quantityRequired * quantity) / bom.quantityPerUnit;
    return {
      itemId: item.itemId,
      itemName: item.itemName,
      itemCode: item.itemCode,
      unitSymbol: item.unitSymbol,
      quantityRequired: item.quantityRequired,
      quantityNeeded,
      costPrice: item.costPrice,
    };
  });

  const totalCost = materials.reduce((sum, m) => sum + (m.quantityNeeded * m.costPrice), 0);
  
  return { materials, totalCost };
};

const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    setProductionData: (state, action: PayloadAction<Partial<ProductionState>>) => {
      const { bomId, warehouseId, quantity, notes } = action.payload;
      
      if (bomId !== undefined) state.bomId = bomId;
      if (warehouseId !== undefined) state.warehouseId = warehouseId;
      if (notes !== undefined) state.notes = notes;
      
      if (quantity !== undefined) {
        state.quantity = quantity;
        // Recalculate if quantity changed
        const { materials, totalCost } = calculateMaterials(state.selectedBOM, state.quantity);
        state.materials = materials;
        state.totalCost = totalCost;
      }
    },

    setSelectedBOM: (state, action: PayloadAction<ProductionBOM | null>) => {
      state.selectedBOM = action.payload;
      // Recalculate when BOM changes
      const { materials, totalCost } = calculateMaterials(state.selectedBOM, state.quantity);
      state.materials = materials;
      state.totalCost = totalCost;
    },

    resetProduction: (state) => {
      state.bomId = initialState.bomId;
      state.warehouseId = initialState.warehouseId;
      state.quantity = initialState.quantity;
      state.notes = initialState.notes;
      state.selectedBOM = initialState.selectedBOM;
      state.materials = initialState.materials;
      state.totalCost = initialState.totalCost;
    },

    initializeProduction: (state, action: PayloadAction<{
      bomId: string;
      warehouseId: string;
      quantity: number;
      notes: string;
      selectedBOM: ProductionBOM;
    }>) => {
      const { bomId, warehouseId, quantity, notes, selectedBOM } = action.payload;
      state.bomId = bomId;
      state.warehouseId = warehouseId;
      state.quantity = quantity;
      state.notes = notes;
      state.selectedBOM = selectedBOM;
      
      // Calculate initial materials
      const { materials, totalCost } = calculateMaterials(selectedBOM, quantity);
      state.materials = materials;
      state.totalCost = totalCost;
    },
  },
});

export const {
  setProductionData,
  setSelectedBOM,
  resetProduction,
  initializeProduction,
} = productionSlice.actions;

export default productionSlice.reducer;
