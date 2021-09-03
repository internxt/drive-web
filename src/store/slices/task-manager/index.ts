import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import taskManagerService, { NotificationData, TaskData, TaskStatus } from '../../../services/task-manager.service';

interface TaskManagerState {
  tasks: TaskData[];
}

export interface TaskFilter {
  relatedTaskId?: string;
  status?: TaskStatus[];
}

export interface UpdateTaskPayload {
  taskId: string;
  merge: Partial<TaskData>;
}

const initialState: TaskManagerState = {
  tasks: [],
};

export const taskManagerSelectors = {
  getTasks:
    (state: RootState) =>
    (filter: TaskFilter = {}): TaskData[] =>
      state.taskManager.tasks.filter((task) => {
        const meetsTheStatus = !filter.status || filter.status.includes(task.status);
        const meetsTheRelatedTaskId = !filter.relatedTaskId || task.relatedTaskId === filter.relatedTaskId;

        return meetsTheStatus && meetsTheRelatedTaskId;
      }),
  getNotifications:
    (state: RootState) =>
    (filter: TaskFilter = {}): NotificationData[] => {
      return taskManagerSelectors
        .getTasks(state)(filter)
        .filter((task) => task.showNotification)
        .map((task) => taskManagerService.getNotification(task))
        .reverse();
    },
  findTaskById:
    (state: RootState) =>
    (taskId: string): TaskData | undefined =>
      state.taskManager.tasks.find((task) => task.id === taskId),
  isTaskFinished:
    (state: RootState) =>
    (taskId: string): boolean =>
      [TaskStatus.Error, TaskStatus.Success, TaskStatus.Cancelled].includes(
        state.taskManager.tasks.find((task) => task.id === taskId)?.status || TaskStatus.Pending,
      ),
  isTaskProgressCompleted:
    (state: RootState) =>
    (taskId: string): boolean =>
      state.taskManager.tasks.find((task) => task.id === taskId)?.progress === 1,
};

const cancelTaskThunk = createAsyncThunk<void, string, { state: RootState }>(
  'tasks/cancelTask',
  async (taskId: string, { getState, dispatch }) => {
    dispatch(
      taskManagerActions.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Cancelled,
        },
      }),
    );

    await (taskManagerSelectors.findTaskById(getState())(taskId)?.stop || (() => undefined))();
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
