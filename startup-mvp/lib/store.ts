import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/lib/features/auth/authSlice";
import notificationReducer from "@/lib/features/notification/notificationSlice";
import quotationReducer from "@/lib/redux/slices/quotationSlice";
import uiReducer from "@/lib/redux/slices/uiSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      notification: notificationReducer,
      quotation: quotationReducer,
      ui: uiReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];