import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UiState {
  isSidebarOpen: boolean;
  isModalOpen: boolean;
  modalType: 'item' | 'component' | 'terms' | null;
  isLoading: boolean;
  notification: Notification | null;
}

const initialState: UiState = {
  isSidebarOpen: false,
  isModalOpen: false,
  modalType: null,
  isLoading: false,
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
    },
    setModalType: (state, action: PayloadAction<'item' | 'component' | 'terms' | null>) => {
      state.modalType = action.payload;
      state.isModalOpen = action.payload !== null;
    },
    openModal: (state, action: PayloadAction<'item' | 'component' | 'terms'>) => {
      state.modalType = action.payload;
      state.isModalOpen = true;
    },
    closeModal: (state) => {
      state.isModalOpen = false;
      state.modalType = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setNotification: (state, action: PayloadAction<Notification | null>) => {
      state.notification = action.payload;
    },
    showNotification: (state, action: PayloadAction<Notification>) => {
      state.notification = action.payload;
    },
    clearNotification: (state) => {
      state.notification = null;
    },
  },
});

export const {
  setSidebarOpen,
  toggleSidebar,
  setModalOpen,
  setModalType,
  openModal,
  closeModal,
  setLoading,
  setNotification,
  showNotification,
  clearNotification,
} = uiSlice.actions;

export default uiSlice.reducer;

