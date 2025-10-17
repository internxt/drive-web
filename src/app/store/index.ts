import { configureStore } from '@reduxjs/toolkit';

import backupsReducer from './slices/backups';
import planReducer from './slices/plan';
import productsReducer from './slices/products';
import referralsReducer from './slices/referrals';
import sessionReducer from './slices/session';
import sharedReducer from './slices/sharedLinks';
import storageReducer from './slices/storage';
import taskManagerReducer from './slices/taskManager';
import uiReducer from './slices/ui';
import userReducer from './slices/user';
import workspacesReducer from './slices/workspaces/workspacesStore';

export const store = configureStore({
  reducer: {
    user: userReducer,
    storage: storageReducer,
    session: sessionReducer,
    ui: uiReducer,
    plan: planReducer,
    products: productsReducer,
    backups: backupsReducer,
    taskManager: taskManagerReducer,
    referrals: referralsReducer,
    shared: sharedReducer,
    workspaces: workspacesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
