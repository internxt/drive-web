import { configureStore } from '@reduxjs/toolkit';

import userReducer from './slices/user';
import teamReducer from './slices/team';
import storageReducer from './slices/storage';
import sessionReducer from './slices/session';
import uiReducer from './slices/ui';
import planReducer from './slices/plan';
import productsReducer from './slices/products';
import paymentReducer from './slices/payment';
import backupsReducer from './slices/backups';
import fileViewerReducer from './slices/fileViewer';
import taskManagerReducer from './slices/taskManager';

export const store = configureStore({
  reducer: {
    user: userReducer,
    team: teamReducer,
    storage: storageReducer,
    session: sessionReducer,
    ui: uiReducer,
    plan: planReducer,
    products: productsReducer,
    payment: paymentReducer,
    backups: backupsReducer,
    fileViewer: fileViewerReducer,
    taskManager: taskManagerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
