import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import tasksService from '../../../tasks/services/tasks.service';
import { TaskEvent } from '../../../tasks/types';
import { uiActions } from '../ui';

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'taskManager/initialize',
  async (payload: void, { dispatch }) => {
    tasksService.addListener({
      event: TaskEvent.TaskAdded,
      listener: (task) => {
        if (task.showNotification) {
          dispatch(uiActions.setIsFileLoggerOpen(true));
        }
      },
    });
  },
);

export const taskManagerSlice = createSlice({
  name: 'task-manager',
  initialState: {},
  reducers: {},
});

export const taskManagerThunks = {
  initializeThunk,
};

export default taskManagerSlice.reducer;
