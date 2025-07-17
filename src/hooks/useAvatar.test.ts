import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAvatar } from './useAvatar';

describe('Tests for useAvatar custom hook', () => {
  // Stable mock functions
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
    deleteDatabaseAvatarMock.mockResolvedValue(null);

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

    renderHook(() =>
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
      expect(downloadAvatarMock).toHaveBeenCalledWith('testSrcURL', expect.any(Object));
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('When the DB avatar url and current URL do not match, then it should download the avatar and save it to the database', async () => {
    const testBlob = new Blob(['test']);
    getDatabaseAvatarMock.mockResolvedValue({
      srcURL: 'oldSrcURL',
      avatarBlob: new Blob(),
      uuid: 'testUUID',
    });
    downloadAvatarMock.mockResolvedValue(testBlob);
    saveAvatarToDatabaseMock.mockResolvedValue(undefined);

    renderHook(() =>
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
      expect(downloadAvatarMock).toHaveBeenCalledTimes(1);
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('When the avatar is still valid, then it should not update the database and return de cached one', async () => {
    getDatabaseAvatarMock.mockResolvedValue({
      srcURL: 'currentSrcURL',
      avatarBlob: new Blob(),
      uuid: 'testUUID',
    });

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
    });
    expect(downloadAvatarMock).not.toHaveBeenCalled();
    expect(saveAvatarToDatabaseMock).not.toHaveBeenCalled();
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
