import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

import { Device, DeviceBackup } from '../../../backups/types';
import backupsService from '../../../backups/services/backups.service';
import downloadService from '../../../drive/services/download.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { DownloadBackupTask, TaskStatus, TaskType } from '../../../tasks/types';
import tasksService from '../../../tasks/services/tasks.service';

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
  'plan/fetchDevices',
  async () => {
    return backupsService.getAllDevices();
  },
);

export const fetchDeviceBackupsThunk = createAsyncThunk<DeviceBackup[], string, { state: RootState }>(
  'plan/fetchDeviceBackups',
  async (deviceMac: string) => {
    return backupsService.getAllBackups(deviceMac);
  },
);

export const downloadBackupThunk = createAsyncThunk<void, DeviceBackup, { state: RootState }>(
  'plan/downloadBackup',
  async (backup: DeviceBackup) => {
    const taskId = tasksService.create<DownloadBackupTask>({
      action: TaskType.DownloadBackup,
      backup: { name: backup.name, type: 'zip' },
      showNotification: true,
      cancellable: true,
    });
    const onProgress = (progress: number) => {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.InProcess,
          progress,
        },
      });
    };

    const onFinished = () => {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    };

    const onError = () => {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Error,
        },
      });
    };

    try {
      const actionState = await downloadService.downloadBackup(backup, {
        progressCallback: onProgress,
        finishedCallback: onFinished,
        errorCallback: onError,
      });

      tasksService.updateTask({
        taskId,
        merge: {
          stop: async () => actionState?.stop(),
        },
      });
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
  },
});

export const backupsSelectors = {};

export const backupsActions = backupsSlice.actions;

export const backupsThunks = {
  fetchDevicesThunk,
  fetchDeviceBackupsThunk,
  downloadBackupThunk,
};

export default backupsSlice.reducer;
