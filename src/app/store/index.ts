import { configureStore } from '@reduxjs/toolkit';

import backupsReducer from '../../views/Backups/store/backupsSlice';
import photosReducer from '../../views/Photos/store';
import planReducer from './slices/plan';
import referralsReducer from './slices/referrals';
import sessionReducer from './slices/session';
import sharedReducer from './slices/sharedLinks';
import storageReducer from './slices/storage';
import taskManagerReducer from './slices/taskManager';
import uiReducer from './slices/ui';
import userReducer from './slices/user';
import workspacesReducer from './slices/workspaces/workspacesStore';
import { fileVersionsReducer } from './slices/fileVersions';

export const store = configureStore({
  reducer: {
    user: userReducer,
    storage: storageReducer,
    session: sessionReducer,
    ui: uiReducer,
    plan: planReducer,
    backups: backupsReducer,
    photos: photosReducer,
    taskManager: taskManagerReducer,
    referrals: referralsReducer,
    shared: sharedReducer,
    workspaces: workspacesReducer,
    fileVersions: fileVersionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
