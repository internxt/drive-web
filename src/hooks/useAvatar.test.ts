// useAvatar.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAvatar } from './useAvatar';
import { isAvatarExpired } from 'app/utils/avatar/avatarUtils';

vi.mock('app/utils/avatar/avatarUtils', () => ({
  isAvatarExpired: vi.fn(),
}));

describe('Tests for useAvatar custom hook', () => {
  let deleteDatabaseAvatarMock: ReturnType<typeof vi.fn>;
  let downloadAvatarMock: ReturnType<typeof vi.fn>;
  let getDatabaseAvatarMock: ReturnType<typeof vi.fn>;
  let saveAvatarToDatabaseMock: ReturnType<typeof vi.fn>;
  let onErrorMock: ReturnType<typeof vi.fn>;
  let isAvatarExpiredMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    deleteDatabaseAvatarMock = vi.fn();
    downloadAvatarMock = vi.fn();
    getDatabaseAvatarMock = vi.fn();
    saveAvatarToDatabaseMock = vi.fn();
    onErrorMock = vi.fn();
    isAvatarExpiredMock = isAvatarExpired as ReturnType<typeof vi.fn>;
    isAvatarExpiredMock.mockReturnValue(false);
  });

  it('When the avatar URL is null, then should delete the avatar from the database and reset avatarBlob to null', async () => {
    deleteDatabaseAvatarMock.mockResolvedValue(undefined);

    renderHook(() =>
      useAvatar({
        avatarSrcURL: null,
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => {
      expect(deleteDatabaseAvatarMock).toHaveBeenCalledTimes(1);
    });
    expect(getDatabaseAvatarMock).not.toHaveBeenCalled();
  });

  it('When no avatar exists in the database, then it should download the avatar and update the database', async () => {
    const testBlob = new Blob(['test']);
    getDatabaseAvatarMock.mockResolvedValue(undefined);
    downloadAvatarMock.mockResolvedValue(testBlob);
    saveAvatarToDatabaseMock.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAvatar({
        avatarSrcURL: 'testSrcURL',
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalledTimes(1);
      expect(downloadAvatarMock).toHaveBeenCalledTimes(1);
      expect(downloadAvatarMock).toHaveBeenCalledWith('testSrcURL', expect.any(AbortSignal));
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledWith('testSrcURL', testBlob);
      expect(result.current.avatarBlob).toBe(testBlob);
    });
  });

  it('When the DB avatar is expired, then it should download the avatar and save it to the database', async () => {
    const testBlob = new Blob(['test']);
    getDatabaseAvatarMock.mockResolvedValue({
      srcURL: 'oldSrcURL',
      avatarBlob: new Blob(),
      uuid: 'testUUID',
    });
    downloadAvatarMock.mockResolvedValue(testBlob);
    saveAvatarToDatabaseMock.mockResolvedValue(undefined);
    isAvatarExpiredMock.mockReturnValue(true);

    const { result } = renderHook(() =>
      useAvatar({
        avatarSrcURL: 'newSrcURL',
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalledTimes(1);
      expect(isAvatarExpiredMock).toHaveBeenCalledWith('oldSrcURL');
      expect(downloadAvatarMock).toHaveBeenCalledTimes(1);
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledTimes(1);
      expect(result.current.avatarBlob).toBe(testBlob);
    });
  });

  it('When the cached avatar is expired, then it should re-download and update the database', async () => {
    const expiredBlob = new Blob(['expired']);
    getDatabaseAvatarMock.mockResolvedValue({
      srcURL: 'expiredUrl',
      avatarBlob: new Blob(),
      uuid: 'testUUID',
    });
    isAvatarExpiredMock.mockReturnValue(true);
    downloadAvatarMock.mockResolvedValue(expiredBlob);
    saveAvatarToDatabaseMock.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAvatar({
        avatarSrcURL: 'expiredUrl',
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalled();
      expect(isAvatarExpiredMock).toHaveBeenCalledWith('expiredUrl');
      expect(downloadAvatarMock).toHaveBeenCalledWith('expiredUrl', expect.any(AbortSignal));
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledWith('expiredUrl', expiredBlob);
      expect(result.current.avatarBlob).toBe(expiredBlob);
    });
  });

  it('When the avatar is still valid, then it should not update the database and return the cached one', async () => {
    const cachedBlob = new Blob(['cached']);
    getDatabaseAvatarMock.mockResolvedValue({
      srcURL: 'currentSrcURL',
      avatarBlob: cachedBlob,
      uuid: 'testUUID',
    });
    // isAvatarExpiredMock returns false by default

    const { result } = renderHook(() =>
      useAvatar({
        avatarSrcURL: 'currentSrcURL',
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalled();
      expect(isAvatarExpiredMock).toHaveBeenCalledWith('currentSrcURL');
      expect(downloadAvatarMock).not.toHaveBeenCalled();
      expect(saveAvatarToDatabaseMock).not.toHaveBeenCalled();
      expect(result.current.avatarBlob).toBe(cachedBlob);
    });
  });

  it('When an unexpected error occurs, then a notification is shown', async () => {
    getDatabaseAvatarMock.mockRejectedValue(new Error('Unexpected error'));

    renderHook(() =>
      useAvatar({
        avatarSrcURL: 'currentSrcURL',
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
        onError: onErrorMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalled();
      expect(onErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(downloadAvatarMock).not.toHaveBeenCalled();
    expect(saveAvatarToDatabaseMock).not.toHaveBeenCalled();
  });
});
