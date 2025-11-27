import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/lib/features/auth/authSlice";
import notificationReducer from "@/lib/features/notification/notificationSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      notification: notificationReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];