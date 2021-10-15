import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import taskManagerService from '../../../services/task-manager.service';
import { TaskManagerEvent } from '../../../services/task-manager.service/enums';
import { uiActions } from '../ui';

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'taskManager/initialize',
  async (payload: void, { dispatch }) => {
    const onTaskAdded = () => {
      dispatch(uiActions.setIsFileLoggerOpen(true));
    };

    taskManagerService.addListener(TaskManagerEvent.TaskAdded, onTaskAdded);
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
