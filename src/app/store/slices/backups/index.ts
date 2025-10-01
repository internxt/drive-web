import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

import { Device, DeviceBackup } from '@internxt/sdk/dist/drive/backups/types';
import backupsService from '../../../backups/services/backups.service';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

interface BackupsState {
  isLoadingDevices: boolean;
  isLoadingDeviceBackups: boolean;
  currentDevice: Device | DriveFolderData | null;
  devices: (Device | DriveFolderData)[];
  backups: DeviceBackup[];
  currentFolder: Device | DriveFolderData | null;
}

const initialState: BackupsState = {
  isLoadingDevices: false,
  isLoadingDeviceBackups: false,
  currentDevice: null,
  devices: [],
  backups: [],
  currentFolder: null,
};

export const fetchDevicesThunk = createAsyncThunk<Array<Device | DriveFolderData>, void, { state: RootState }>(
  'backups/fetchDevices',
  async () => {
    const [devices, folders] = await Promise.all([
      backupsService.getAllDevices(),
      backupsService.getAllDevicesAsFolders(),
    ]);
    const backupFoldersNotDeleted = folders.filter((folder) => !folder.deleted);

    return [...devices, ...backupFoldersNotDeleted];
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

export const backupsSlice = createSlice({
  name: 'backups',
  initialState,
  reducers: {
    setCurrentDevice: (state, action: PayloadAction<Device | null | DriveFolderData>) => {
      state.currentDevice = action.payload;
      state.backups = [];
    },
    setCurrentFolder: (state, action: PayloadAction<Device | null | DriveFolderData>) => {
      state.currentFolder = action.payload;
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

export const backupsActions = backupsSlice.actions;

export const backupsThunks = {
  fetchDevicesThunk,
  fetchDeviceBackupsThunk,
  deleteBackupThunk,
  deleteDeviceThunk,
};

export default backupsSlice.reducer;
