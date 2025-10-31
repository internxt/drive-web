import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useBackupDeviceActions } from './useBackupDeviceActions';
import { backupsActions, backupsThunks } from '../store/backupsSlice';
import { deleteItemsThunk } from 'app/store/slices/storage/storage.thunks/deleteItemsThunk';
import backupsService from '../services/backups.service';
import { Device } from '@internxt/sdk/dist/drive/backups/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { useAppSelector } from 'app/store/hooks';

vi.mock('app/store/hooks', () => ({
  useAppSelector: vi.fn((selector) => selector({ backups: { currentDevice: null } })),
}));

vi.mock('../store/backupsSlice', () => ({
  backupsActions: {
    setCurrentDevice: vi.fn((payload) => ({ type: 'backups/setCurrentDevice', payload })),
  },
  backupsThunks: {
    fetchDevicesThunk: vi.fn(() => ({ type: 'backups/fetchDevices' })),
    fetchDeviceBackupsThunk: vi.fn((mac: string) => ({ type: 'backups/fetchDeviceBackups', payload: mac })),
    deleteDeviceThunk: vi.fn((device: Device) => ({
      type: 'backups/deleteDevice',
      payload: device,
      unwrap: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('app/store/slices/storage/storage.thunks/deleteItemsThunk', () => ({
  deleteItemsThunk: vi.fn(() => ({ unwrap: vi.fn(() => Promise.resolve()) })),
}));

vi.mock('../services/backups.service', () => ({
  default: {
    deleteBackupDeviceAsFolder: vi.fn(() => Promise.resolve()),
  },
}));

describe('useBackupDeviceActions', () => {
  let onFolderUuidChanges: Mock;
  let onBreadcrumbFolderChanges: Mock;
  let dispatch: Mock;

  const mockDevice: Device = {
    id: 1,
    mac: 'AA:BB:CC:DD:EE:FF',
    userId: 1,
    platform: 'darwin' as const,
    key: 'test-key',
    hostname: 'Test Device',
    folderUuid: 'folder-uuid-device',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    folder: null,
  };

  const mockFolder = {
    id: 2,
    uuid: 'folder-uuid-123',
    plainName: 'Test Folder',
    bucket: 'test-bucket',
    encrypt_version: '03-aes',
    deleted: false,
    userId: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  } as DriveFolderData;

  beforeEach(() => {
    vi.clearAllMocks();
    onFolderUuidChanges = vi.fn();
    onBreadcrumbFolderChanges = vi.fn();
    dispatch = vi.fn((action) => {
      if (action && typeof action === 'object' && 'unwrap' in action) {
        return action;
      }
      return Promise.resolve(action);
    });
  });

  it('should start with no devices selected, delete modal closed, and load available devices', () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    expect(result.current.isDeleteModalOpen).toBe(false);
    expect(result.current.selectedDevices).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith(backupsActions.setCurrentDevice(null));
    expect(onBreadcrumbFolderChanges).toHaveBeenCalledWith([]);
    expect(onFolderUuidChanges).toHaveBeenCalledWith(undefined);
    expect(dispatch).toHaveBeenCalledWith(backupsThunks.fetchDevicesThunk());
  });

  it('should show navigation path when viewing a folder', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAppSelector).mockImplementation((selector: any) =>
      selector({
        backups: {
          currentDevice: mockFolder,
          isLoadingDevices: false,
          isLoadingDeviceBackups: false,
          devices: [],
          backups: [],
          currentFolder: null,
        },
      }),
    );

    renderHook(() => useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch));

    expect(onBreadcrumbFolderChanges).toHaveBeenCalledWith([mockFolder]);
    expect(onFolderUuidChanges).toHaveBeenCalledWith(mockFolder.uuid);
  });

  it('should navigate through folder hierarchy using breadcrumbs', () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    const mockFolders = [
      { id: 1, uuid: 'uuid-1' },
      { id: 2, uuid: 'uuid-2' },
      { id: 3, uuid: 'uuid-3' },
    ] as DriveFolderData[];

    act(() => {
      result.current.goToFolder(2, 'uuid-2');
    });

    const callback = onBreadcrumbFolderChanges.mock.calls.at(-1)?.[0];
    const newBreadcrumbs = callback(mockFolders);
    expect(newBreadcrumbs).toEqual([mockFolders[0], mockFolders[1]]);
    expect(onFolderUuidChanges).toHaveBeenCalledWith('uuid-2');

    const initialCallCount = onFolderUuidChanges.mock.calls.length;
    act(() => {
      result.current.goToFolder(1);
    });
    expect(onFolderUuidChanges.mock.calls.length).toBe(initialCallCount);
  });

  it('should return to devices list and clear all selections', () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    act(() => {
      result.current.onDevicesSelected([{ device: mockDevice, isSelected: true }]);
    });

    expect(result.current.selectedDevices).toHaveLength(1);

    act(() => {
      result.current.goToFolderRoot();
    });

    expect(result.current.selectedDevices).toEqual([]);
    expect(onFolderUuidChanges).toHaveBeenCalledWith(undefined);
    expect(dispatch).toHaveBeenCalledWith(backupsActions.setCurrentDevice(null));
  });

  it('should open a device and load its backups', () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    act(() => {
      result.current.onDevicesSelected([{ device: mockFolder, isSelected: true }]);
    });

    expect(result.current.selectedDevices).toHaveLength(1);

    act(() => {
      result.current.onDeviceClicked(mockDevice);
    });

    expect(result.current.selectedDevices).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith(backupsActions.setCurrentDevice(mockDevice));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dispatch).toHaveBeenCalledWith(backupsThunks.fetchDeviceBackupsThunk(mockDevice.mac!));

    const fetchDeviceBackupsCallCount = vi.mocked(backupsThunks.fetchDeviceBackupsThunk).mock.calls.length;

    act(() => {
      result.current.onDeviceClicked(mockFolder);
    });

    expect(vi.mocked(backupsThunks.fetchDeviceBackupsThunk).mock.calls.length).toBe(fetchDeviceBackupsCallCount);
  });

  it('should show delete confirmation with selected devices', () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    expect(result.current.isDeleteModalOpen).toBe(false);

    act(() => {
      result.current.onOpenDeleteModal([mockDevice]);
    });

    expect(result.current.selectedDevices).toEqual([mockDevice]);
    expect(result.current.isDeleteModalOpen).toBe(true);

    act(() => {
      result.current.onCloseDeleteModal();
      result.current.onDevicesSelected([{ device: mockDevice, isSelected: true }]);
    });

    expect(result.current.selectedDevices).toHaveLength(1);

    act(() => {
      result.current.onOpenDeleteModal([mockFolder]);
    });

    expect(result.current.selectedDevices).toEqual([mockDevice, mockFolder]);
  });

  it('should select and deselect devices without duplicates', () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    const device2 = { ...mockDevice, id: 3, mac: 'FF:EE:DD:CC:BB:AA' };

    act(() => {
      result.current.onDevicesSelected([
        { device: mockDevice, isSelected: true },
        { device: mockFolder, isSelected: true },
        { device: device2, isSelected: true },
      ]);
    });

    expect(result.current.selectedDevices).toHaveLength(3);

    act(() => {
      result.current.onDevicesSelected([{ device: mockDevice, isSelected: true }]);
    });

    expect(result.current.selectedDevices).toHaveLength(3);

    act(() => {
      result.current.onDevicesSelected([
        { device: mockDevice, isSelected: false },
        { device: device2, isSelected: false },
      ]);
    });

    expect(result.current.selectedDevices).toEqual([mockFolder]);
  });

  it('should remove devices and folders, then close confirmation and clear selection', async () => {
    const { result } = renderHook(() =>
      useBackupDeviceActions(onFolderUuidChanges, onBreadcrumbFolderChanges, dispatch),
    );

    act(() => {
      result.current.onDevicesSelected([
        { device: mockDevice, isSelected: true },
        { device: mockFolder, isSelected: true },
      ]);
    });

    await act(async () => {
      await result.current.onConfirmDelete();
    });

    expect(vi.mocked(backupsThunks.deleteDeviceThunk)).toHaveBeenCalledWith(mockDevice);
    expect(vi.mocked(deleteItemsThunk)).toHaveBeenCalledWith([mockFolder]);
    expect(vi.mocked(backupsService.deleteBackupDeviceAsFolder)).toHaveBeenCalledWith(mockFolder.uuid);

    await waitFor(() => {
      expect(result.current.isDeleteModalOpen).toBe(false);
      expect(result.current.selectedDevices).toEqual([]);
    });
  });
});
