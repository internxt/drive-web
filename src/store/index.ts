import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import networkReducer from './slices/networkSlice';
import layoutReducer from './slices/layoutSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer,
    layout: layoutReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;