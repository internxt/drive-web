import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { TaskStatus } from '../../../models/enums';
import { NotificationData, UpdateNotificationPayload } from '../../../models/interfaces';

interface TasksState {
  notifications: NotificationData[],
}

const initialState: TasksState = {
  notifications: []
};

export const tasksSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state: TasksState, action: PayloadAction<NotificationData>) => {
      state.notifications.push(action.payload);
    },
    updateNotification: (state: TasksState, action: PayloadAction<UpdateNotificationPayload>) => {
      Object.assign(
        state.notifications.find(n => n.uuid === action.payload.uuid),
        action.payload.merge
      );
    },
    clearNotifications: (state: TasksState) => {
      state.notifications = [];
    },
    resetState: (state: TasksState) => {
      Object.assign(state, initialState);
    }
  }
});

export const tasksSelectors = {
  getSuccessfulNotifications: (state: RootState): NotificationData[] =>
    state.tasks.notifications.filter(n => n.status === TaskStatus.Success),
  getFinishedNotifications: (state: RootState): NotificationData[] =>
    state.tasks.notifications.filter(n => n.status === TaskStatus.Success || n.status === TaskStatus.Error)
};

export const {
  addNotification,
  updateNotification,
  clearNotifications
} = tasksSlice.actions;

export const tasksActions = tasksSlice.actions;

export default tasksSlice.reducer;