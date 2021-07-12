import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import networkReducer from './slices/networkSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;