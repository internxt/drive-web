import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { FileStatusTypes } from '../../../models/enums';
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
    }
  }
});

export const tasksSelectors = {
  getSuccessfulNotifications: (state: RootState): NotificationData[] =>
    state.tasks.notifications.filter(n => n.status === FileStatusTypes.Success),
  getFinishedNotifications: (state: RootState): NotificationData[] =>
    state.tasks.notifications.filter(n => n.status === FileStatusTypes.Success || n.status === FileStatusTypes.Error)
};

export const {
  addNotification,
  updateNotification,
  clearNotifications
} = tasksSlice.actions;

export const tasksActions = tasksSlice.actions;

export default tasksSlice.reducer;