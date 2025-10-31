import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from 'app/store/slices/storage/storage.model';
import { AppConfig } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';

vi.mock('../services/fetchRecents', () => ({
  fetchRecents: vi.fn(),
}));

vi.mock('app/core/services/config.service', () => ({
  default: {
    getAppConfig: vi.fn(),
  },
}));

vi.mock('app/crypto/services/utils', () => ({
  getItemPlainName: vi.fn(),
  excludeHiddenItems: vi.fn(),
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    setRecents: vi.fn((payload) => ({ type: 'storage/setRecents', payload })),
  },
  storageSelectors: {},
}));

describe('fetchRecentsThunk', () => {
  const dispatch = vi.fn();
  const getState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should load recent files and update the store with decrypted names', async () => {
    const { fetchRecentsThunk } = await import('./fetchRecentsThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { fetchRecents } = await import('../services/fetchRecents');
    const configService = await import('app/core/services/config.service');
    const cryptoUtils = await import('app/crypto/services/utils');

    const mockRecents: Partial<DriveItemData>[] = [
      { id: 1, name: 'encrypted-file1.txt', plainName: 'file1.txt' },
      { id: 2, name: 'encrypted-file2.txt', plainName: 'file2.txt' },
    ];
    const mockFormattedRecents: Partial<DriveItemData>[] = [
      { id: 1, name: 'file1.txt', plainName: 'file1.txt' },
      { id: 2, name: 'file2.txt', plainName: 'file2.txt' },
    ];
    const mockRecentsLimit = 50;

    vi.mocked(configService.default.getAppConfig).mockReturnValue({
      fileExplorer: { recentsLimit: mockRecentsLimit, download: { folder: { method: 'stream' } } },
    } as unknown as AppConfig);
    vi.mocked(fetchRecents).mockResolvedValue(mockRecents as DriveItemData[]);
    vi.mocked(cryptoUtils.getItemPlainName).mockImplementation(
      (item) => (item as Partial<DriveItemData>).plainName ?? '',
    );
    vi.mocked(cryptoUtils.excludeHiddenItems).mockReturnValue(mockFormattedRecents as DriveItemData[]);

    await fetchRecentsThunk()(dispatch, getState, undefined);

    expect(configService.default.getAppConfig).toHaveBeenCalled();
    expect(fetchRecents).toHaveBeenCalledWith(mockRecentsLimit);
    expect(cryptoUtils.getItemPlainName).toHaveBeenCalledTimes(2);
    expect(cryptoUtils.excludeHiddenItems).toHaveBeenCalledWith(mockFormattedRecents);
    expect(storageActions.setRecents).toHaveBeenCalledWith(mockFormattedRecents);
    expect(dispatch).toHaveBeenCalled();
  });
});

describe('fetchRecentsThunkExtraReducers', () => {
  it('should handle pending, fulfilled, and rejected states', async () => {
    const { fetchRecentsThunkExtraReducers } = await import('./fetchRecentsThunk');

    const callbacks: Array<(state: StorageState) => void> = [];
    const builder = {
      addCase: vi.fn().mockImplementation((_, callback) => {
        if (callback) callbacks.push(callback);
        return builder;
      }),
    } as unknown as ActionReducerMapBuilder<StorageState>;

    fetchRecentsThunkExtraReducers(builder);

    expect(builder.addCase).toHaveBeenCalledTimes(3);

    const pendingState = { isLoadingRecents: false } as StorageState;
    callbacks[0](pendingState);
    expect(pendingState.isLoadingRecents).toBe(true);

    const fulfilledState = { isLoadingRecents: true } as StorageState;
    callbacks[1](fulfilledState);
    expect(fulfilledState.isLoadingRecents).toBe(false);

    const rejectedState = { isLoadingRecents: true } as StorageState;
    callbacks[2](rejectedState);
    expect(rejectedState.isLoadingRecents).toBe(false);
  });
});
