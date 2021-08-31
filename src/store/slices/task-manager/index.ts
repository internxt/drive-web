import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import taskManagerService, { NotificationData, TaskData, TaskStatus } from '../../../services/task-manager.service';

interface TaskManagerState {
  tasks: TaskData[];
}

export interface UpdateTaskPayload {
  taskId: string;
  merge: {
    status?: TaskStatus;
    progress?: number;
  };
}

const initialState: TaskManagerState = {
  tasks: [],
};

export const taskManagerSelectors = {
  getNotifications:
    (filter: { status?: TaskStatus[] } = {}) =>
    (state: RootState): NotificationData[] => {
      return state.taskManager.tasks
        .filter((task) => {
          const meetsTheStatus = !filter.status || filter.status.includes(task.status);
          return meetsTheStatus;
        })
        .map((task) => taskManagerService.getNotification(task));
    },
};

const cancelTaskThunk = createAsyncThunk<void, string, { state: RootState }>(
  'tasks/cancelTask',
  async (taskId: string, { dispatch }) => {
    // TODO: cancel task by type
  },
);

export const taskManagerSlice = createSlice({
  name: 'task-manager',
  initialState,
  reducers: {
    addTask: (state: TaskManagerState, action: PayloadAction<TaskData>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state: TaskManagerState, action: PayloadAction<UpdateTaskPayload>) => {
      Object.assign(
        state.tasks.find((task) => task.id === action.payload.taskId),
        action.payload.merge,
      );
    },
    clearTasks: (state: TaskManagerState) => {
      state.tasks = [];
    },
    resetState: (state: TaskManagerState) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(cancelTaskThunk.pending, () => undefined)
      .addCase(cancelTaskThunk.fulfilled, () => undefined)
      .addCase(cancelTaskThunk.rejected, () => undefined);
  },
});

export const taskManagerActions = taskManagerSlice.actions;

export const taskManagerThunks = {
  cancelTaskThunk,
};

export default taskManagerSlice.reducer;
