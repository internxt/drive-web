import { configureStore } from '@reduxjs/toolkit';

import userReducer from './slices/userSlice';
import networkReducer from './slices/networkSlice';
import storageReducer from './slices/storageSlice';
import uiReducer from './slices/uiSlice';
import filesState from './slices/filesStateSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    network: networkReducer,
    storage: storageReducer,
    ui: uiReducer,
    filesState: filesState
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;