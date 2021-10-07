import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

import { Device, DeviceBackup } from '../../../models/interfaces';
import backupsService from '../../../services/backups.service';
import { downloadBackup } from '../../../services/download.service';
import notificationsService, { ToastType } from '../../../services/notifications.service';
import { DownloadBackupTask, TaskProgress, TaskStatus, TaskType } from '../../../services/task-manager.service';
import { taskManagerActions } from '../task-manager';

interface BackupsState {
  isLoadingDevices: boolean;
  isLoadingDeviceBackups: boolean;
  currentDevice: Device | null;
  devices: Device[];
  backups: DeviceBackup[];
}

const initialState: BackupsState = {
  isLoadingDevices: false,
  isLoadingDeviceBackups: false,
  currentDevice: null,
  devices: [],
  backups: [],
};

export const fetchDevicesThunk = createAsyncThunk<Device[], void, { state: RootState }>(
  'backups/fetchDevices',
  async () => {
    return backupsService.getAllDevices();
  },
);

export const fetchDeviceBackupsThunk = createAsyncThunk<DeviceBackup[], string, { state: RootState }>(
  'backups/fetchDeviceBackups',
  async (deviceMac: string) => {
    return backupsService.getAllBackups(deviceMac);
  },
);

export const deleteBackupThunk = createAsyncThunk<DeviceBackup, DeviceBackup, { state: RootState }>(
  'backups/deleteBackup',
  async (backup: DeviceBackup) => {
    await backupsService.deleteBackup(backup);
    return backup;
  },
);

export const downloadBackupThunk = createAsyncThunk<void, DeviceBackup, { state: RootState }>(
  'backups/downloadBackup',
  async (backup: DeviceBackup, { requestId, dispatch }) => {
    const taskId = requestId;
    const task: DownloadBackupTask = {
      id: taskId,
      action: TaskType.DownloadBackup,
      status: TaskStatus.Pending,
      progress: TaskProgress.Min,
      backup: { name: backup.name, type: 'zip' },
      showNotification: true,
      cancellable: true,
    };

    const onProgress = (progress: number) => {
      dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            status: TaskStatus.InProcess,
            progress,
          },
        }),
      );
    };

    const onFinished = () => {
      dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Success,
          },
        }),
      );
    };

    const onError = () => {
      dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Error,
          },
        }),
      );
    };

    try {
      const actionState = await downloadBackup(backup, {
        progressCallback: onProgress,
        finishedCallback: onFinished,
        errorCallback: onError,
      });

      dispatch(taskManagerActions.addTask(task));

      dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            stop: async () => actionState?.stop(),
          },
        }),
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'FILE_SYSTEM_API_NOT_AVAILABLE')
        notificationsService.show(
          'To download backups you need to use a Chromium based browser (such as Chrome or Edge but not Brave) with a version above 86',
          ToastType.Error,
          8000,
        );
      else
        notificationsService.show(
          'An error has ocurred while trying to download your backup, please try again',
          ToastType.Error,
        );
    }
  },
);

export const backupsSlice = createSlice({
  name: 'backups',
  initialState,
  reducers: {
    setCurrentDevice: (state, action: PayloadAction<Device | null>) => {
      state.currentDevice = action.payload;
      state.backups = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevicesThunk.pending, (state) => {
        state.isLoadingDevices = true;
      })
      .addCase(fetchDevicesThunk.fulfilled, (state, action) => {
        state.isLoadingDevices = false;
        state.devices = action.payload;
      })
      .addCase(fetchDevicesThunk.rejected, (state) => {
        state.isLoadingDevices = false;
      });

    builder
      .addCase(fetchDeviceBackupsThunk.pending, (state) => {
        state.isLoadingDeviceBackups = true;
      })
      .addCase(fetchDeviceBackupsThunk.fulfilled, (state, action) => {
        state.isLoadingDeviceBackups = false;
        state.backups = action.payload;
      })
      .addCase(fetchDeviceBackupsThunk.rejected, (state) => {
        state.isLoadingDeviceBackups = false;
      });

    builder
      .addCase(downloadBackupThunk.pending, () => undefined)
      .addCase(downloadBackupThunk.fulfilled, () => undefined)
      .addCase(downloadBackupThunk.rejected, () => undefined);

    builder
      .addCase(deleteBackupThunk.pending, () => undefined)
      .addCase(deleteBackupThunk.fulfilled, (state, action) => {
        state.backups = state.backups.filter((b) => b.id !== action.payload.id);
      })
      .addCase(deleteBackupThunk.rejected, () => undefined);
  },
});

export const backupsSelectors = {};

export const backupsActions = backupsSlice.actions;

export const backupsThunks = {
  fetchDevicesThunk,
  fetchDeviceBackupsThunk,
  downloadBackupThunk,
  deleteBackupThunk,
};

export default backupsSlice.reducer;
