import { configureStore } from '@reduxjs/toolkit';

import userReducer from './slices/userSlice';
import networkReducer from './slices/networkSlice';
import storageReducer from './slices/storageSlice';
import layoutReducer from './slices/layoutSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer,
    storage: storageReducer,
    layout: layoutReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;