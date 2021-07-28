import { configureStore } from '@reduxjs/toolkit';

import userReducer from './slices/user';
import teamReducer from './slices/team';
import networkReducer from './slices/network';
import storageReducer from './slices/storage';
import uiReducer from './slices/ui';
import filesState from './slices/files';

export const store = configureStore({
  reducer: {
    user: userReducer,
    team: teamReducer,
    network: networkReducer,
    storage: storageReducer,
    ui: uiReducer,
    filesState: filesState
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;