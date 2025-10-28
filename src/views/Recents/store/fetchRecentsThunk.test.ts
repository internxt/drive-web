import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { fetchRecentsThunk, fetchRecentsThunkExtraReducers } from './fetchRecentsThunk';
import { fetchRecents } from '../services';
import configService from 'app/core/services/config.service';
import { excludeHiddenItems, getItemPlainName } from 'app/crypto/services/utils';
import { storageActions } from 'app/store/slices/storage';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from 'app/store/slices/storage/storage.model';

vi.mock('../services/fetchRecents', () => ({
  fetchRecents: vi.fn(),
}));

vi.mock('app/core/services/config.service', () => ({
  default: {
    getAppConfig: vi.fn(),
  },
}));

vi.mock('app/crypto/services/utils', () => ({
  excludeHiddenItems: vi.fn(),
  getItemPlainName: vi.fn(),
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    setRecents: vi.fn(),
  },
}));

describe('fetchRecentsThunk', () => {
  const dispatch = vi.fn();
  const getState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch recents and dispatch setRecents action', async () => {
    const mockRecents = [
      { id: 1, name: 'encrypted-file1.txt', plainName: 'file1.txt' },
      { id: 2, name: 'encrypted-file2.txt', plainName: 'file2.txt' },
    ];
    const mockFormattedRecents = [
      { id: 1, name: 'file1.txt', plainName: 'file1.txt' },
      { id: 2, name: 'file2.txt', plainName: 'file2.txt' },
    ];
    const mockRecentsLimit = 50;

    (configService.getAppConfig as Mock).mockReturnValue({
      fileExplorer: { recentsLimit: mockRecentsLimit },
    });
    (fetchRecents as Mock).mockResolvedValue(mockRecents);
    (getItemPlainName as Mock).mockImplementation((item) => item.plainName);
    (excludeHiddenItems as Mock).mockReturnValue(mockFormattedRecents);
    (storageActions.setRecents as unknown as Mock).mockReturnValue({ type: 'storage/setRecents' });

    await fetchRecentsThunk()(dispatch, getState, undefined);

    expect(configService.getAppConfig).toHaveBeenCalled();
    expect(fetchRecents).toHaveBeenCalledWith(mockRecentsLimit);
    expect(getItemPlainName).toHaveBeenCalledTimes(2);
    expect(excludeHiddenItems).toHaveBeenCalledWith(mockFormattedRecents);
    expect(storageActions.setRecents).toHaveBeenCalledWith(mockFormattedRecents);
    expect(dispatch).toHaveBeenCalledWith({ type: 'storage/setRecents' });
  });
});

describe('fetchRecentsThunkExtraReducers', () => {
  it('should handle pending, fulfilled, and rejected states', () => {
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
