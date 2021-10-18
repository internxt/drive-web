import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import tasksService from '../../../tasks/services/tasks.service';
import { TaskManagerEvent } from '../../../tasks/types';
import { uiActions } from '../ui';

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'taskManager/initialize',
  async (payload: void, { dispatch }) => {
    const onTaskAdded = () => {
      dispatch(uiActions.setIsFileLoggerOpen(true));
    };

    tasksService.addListener(TaskManagerEvent.TaskAdded, onTaskAdded);
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
