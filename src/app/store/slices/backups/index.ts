import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

import { Device, DeviceBackup } from '../../../backups/types';
import backupsService from '../../../backups/services/backups.service';
import downloadService from '../../../drive/services/download.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { DownloadBackupTask, TaskStatus, TaskType } from '../../../tasks/types';
import tasksService from '../../../tasks/services/tasks.service';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

interface BackupsState {
  isLoadingDevices: boolean;
  isLoadingDeviceBackups: boolean;
  currentDevice: Device | DriveFolderData | null;
  devices: (Device | DriveFolderData)[];
  backups: DeviceBackup[];
}

const initialState: BackupsState = {
  isLoadingDevices: false,
  isLoadingDeviceBackups: false,
  currentDevice: null,
  devices: [],
  backups: [],
};

export const fetchDevicesThunk = createAsyncThunk<Array<Device | DriveFolderData>, void, { state: RootState }>(
  'backups/fetchDevices',
  async () => {
    const [devices, folders] = await Promise.all([
      backupsService.getAllDevices(),
      backupsService.getAllDevicesAsFolders(),
    ]);
    return [...devices, ...folders];
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

export const deleteDeviceThunk = createAsyncThunk<Device, Device, { state: RootState }>(
  'backups/deleteDevice',
  async (device: Device) => {
    await backupsService.deleteDevice(device);
    return device;
  },
);

export const downloadBackupThunk = createAsyncThunk<void, DeviceBackup, { state: RootState }>(
  'backups/downloadBackup',
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
          stop: async () => actionState?.abort(),
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'FILE_SYSTEM_API_NOT_AVAILABLE')
        notificationsService.show({
          text: 'To download backups you need to use a Chromium based browser\
           (such as Chrome or Edge but not Brave) with a version above 86',
          type: ToastType.Error,
          duration: 8000,
        });
      else
        notificationsService.show({
          text: 'An error has ocurred while trying to download your backup, please try again',
          type: ToastType.Error,
        });
    }
  },
);

export const backupsSlice = createSlice({
  name: 'backups',
  initialState,
  reducers: {
    setCurrentDevice: (state, action: PayloadAction<Device | null | DriveFolderData>) => {
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

    builder
      .addCase(deleteDeviceThunk.pending, () => undefined)
      .addCase(deleteDeviceThunk.fulfilled, (state, action) => {
        state.devices = state.devices.filter((b) => b.id !== action.payload.id);
      })
      .addCase(deleteDeviceThunk.rejected, () => undefined);
  },
});

export const backupsSelectors = {};

export const backupsActions = backupsSlice.actions;

export const backupsThunks = {
  fetchDevicesThunk,
  fetchDeviceBackupsThunk,
  downloadBackupThunk,
  deleteBackupThunk,
  deleteDeviceThunk,
};

export default backupsSlice.reducer;
