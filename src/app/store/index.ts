import { configureStore } from '@reduxjs/toolkit';

import backupsReducer from './slices/backups';
import fileViewerReducer from './slices/fileViewer';
import newsletterReducer from './slices/newsletter';
import paymentReducer from './slices/payment';
import photosReducer from './slices/photos';
import planReducer from './slices/plan';
import productsReducer from './slices/products';
import referralsReducer from './slices/referrals';
import sessionReducer from './slices/session';
import sharedReducer from './slices/sharedLinks';
import storageReducer from './slices/storage';
import taskManagerReducer from './slices/taskManager';
import teamReducer from './slices/team';
import uiReducer from './slices/ui';
import userReducer from './slices/user';

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
    referrals: referralsReducer,
    newsletter: newsletterReducer,
    photos: photosReducer,
    shared: sharedReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
