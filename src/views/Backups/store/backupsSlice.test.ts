import { describe, it, expect, vi, beforeEach } from 'vitest';
import backupsReducer, { backupsActions, backupsThunks } from './backupsSlice';
import backupsService from '../services/backups.service';
import { Device } from '@internxt/sdk/dist/drive/backups/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

vi.mock('../services/backups.service', () => ({
  default: {
    getAllDevices: vi.fn(),
    getAllDevicesAsFolders: vi.fn(),
  },
}));

describe('backupsSlice', () => {
  const mockDevice: Device = {
    id: 1,
    mac: 'AA:BB:CC:DD:EE:FF',
    userId: 1,
    platform: 'darwin',
    key: 'test-key',
    hostname: 'Test Device',
    folderUuid: 'folder-uuid-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    folder: null,
  };

  const mockFolder = {
    id: 2,
    uuid: 'folder-uuid-2',
    deleted: false,
    isFolder: true,
  } as unknown as DriveFolderData;

  const mockDeletedFolder = {
    id: 3,
    uuid: 'folder-uuid-3',
    deleted: true,
    isFolder: true,
  } as unknown as DriveFolderData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear backups when setting current device', () => {
    const initialState = backupsReducer(undefined, { type: 'init' });
    const stateWithBackups = { ...initialState, backups: [{ id: 1 }] as never[] };

    const newState = backupsReducer(stateWithBackups, backupsActions.setCurrentDevice(mockDevice));

    expect(newState.currentDevice).toEqual(mockDevice);
    expect(newState.backups).toEqual([]);
  });

  it('should filter out deleted folders when fetching devices', async () => {
    vi.mocked(backupsService.getAllDevices).mockResolvedValue([mockDevice]);
    vi.mocked(backupsService.getAllDevicesAsFolders).mockResolvedValue([mockFolder, mockDeletedFolder]);

    const result = await backupsThunks.fetchDevicesThunk()(vi.fn(), vi.fn(), undefined);

    expect(result.payload).toEqual([mockDevice, mockFolder]);
  });

  it('should remove device from state after deletion', () => {
    const initialState = backupsReducer(undefined, { type: 'init' });
    const stateWithDevices = { ...initialState, devices: [mockDevice, mockFolder] };

    const newState = backupsReducer(stateWithDevices, {
      type: backupsThunks.deleteDeviceThunk.fulfilled.type,
      payload: mockDevice,
    });

    expect(newState.devices).toEqual([mockFolder]);
  });
});
