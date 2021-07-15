import { configureStore } from '@reduxjs/toolkit';

import userReducer from './slices/userSlice';
import networkReducer from './slices/networkSlice';
import storageReducer from './slices/storageSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer,
    storage: storageReducer,
    ui: uiReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;