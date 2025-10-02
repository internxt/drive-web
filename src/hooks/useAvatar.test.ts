// useAvatar.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAvatar } from './useAvatar';

describe('Tests for useAvatar custom hook', () => {
  let deleteDatabaseAvatarMock: ReturnType<typeof vi.fn>;
  let downloadAvatarMock: ReturnType<typeof vi.fn>;
  let getDatabaseAvatarMock: ReturnType<typeof vi.fn>;
  let saveAvatarToDatabaseMock: ReturnType<typeof vi.fn>;
  let onErrorMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    deleteDatabaseAvatarMock = vi.fn();
    downloadAvatarMock = vi.fn();
    getDatabaseAvatarMock = vi.fn();
    saveAvatarToDatabaseMock = vi.fn();
    onErrorMock = vi.fn();
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

  it('When a cached avatar exists, then it should not download and should return cached blob', async () => {
    const cachedBlob = new Blob(['cached']);
    getDatabaseAvatarMock.mockResolvedValue({
      srcURL: 'currentSrcURL',
      avatarBlob: cachedBlob,
      uuid: 'testUUID',
    });

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
