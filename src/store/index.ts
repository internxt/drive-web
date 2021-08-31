import { configureStore } from '@reduxjs/toolkit';

import userReducer from './slices/user';
import teamReducer from './slices/team';
import storageReducer from './slices/storage';
import sessionReducer from './slices/session';
import uiReducer from './slices/ui';
import taskManagerReducer from './slices/task-manager';
import planReducer from './slices/plan';
import productsReducer from './slices/products';

export const store = configureStore({
  reducer: {
    user: userReducer,
    team: teamReducer,
    storage: storageReducer,
    session: sessionReducer,
    ui: uiReducer,
    taskManager: taskManagerReducer,
    plan: planReducer,
    products: productsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
