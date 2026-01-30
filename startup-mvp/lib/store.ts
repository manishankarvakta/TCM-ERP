import { configureStore } from "@reduxjs/toolkit";
import { persistStore } from "redux-persist";
import authReducer from "@/lib/features/auth/authSlice";
import notificationReducer from "@/lib/features/notification/notificationSlice";
import quotationReducer from "@/lib/redux/slices/quotationSlice";
import uiReducer from "@/lib/redux/slices/uiSlice";
import purchaseReducer from "@/lib/redux/slices/purchaseSlice";
import productionReducer from "@/lib/redux/slices/productionSlice";
import salesReducer from "@/lib/redux/slices/salesSlice";

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      notification: notificationReducer,
      quotation: quotationReducer,
      ui: uiReducer,
      purchase: purchaseReducer,
      production: productionReducer,
      sales: salesReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
  });

  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];