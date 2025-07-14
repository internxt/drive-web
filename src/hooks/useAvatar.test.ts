import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAvatar } from './useAvatar';
import notificationsService from 'app/notifications/services/notifications.service';

describe('Tests for useAvatar custom hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('When the avatar URL is null, then should delete the avatar from the database and reset avatarBlob to null', async () => {
    const getDatabaseAvatarMock = vi.fn();
    const deleteDatabaseAvatarMock = vi.fn().mockResolvedValue(null);
    renderHook(() =>
      useAvatar({
        avatarSrcURL: null,
        deleteDatabaseAvatar: deleteDatabaseAvatarMock,
        downloadAvatar: vi.fn(),
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: vi.fn(),
      }),
    );

    expect(deleteDatabaseAvatarMock).toHaveBeenCalledTimes(1);
    expect(getDatabaseAvatarMock).not.toHaveBeenCalled();
  });

  it('When no avatar exists in the database, then it should download the avatar and update the database', async () => {
    const getDatabaseAvatarMock = vi.fn().mockResolvedValue(undefined);
    const downloadAvatarMock = vi.fn().mockResolvedValue(new Blob());
    const saveAvatarToDatabaseMock = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAvatar({
        avatarSrcURL: 'testSrcURL',
        deleteDatabaseAvatar: vi.fn(),
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalledTimes(1);
      expect(downloadAvatarMock).toHaveBeenCalledTimes(1);
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('When the DB avatar url and current URL do not match, then it should download the avatar and save it to the database', async () => {
    const getDatabaseAvatarMock = vi.fn().mockResolvedValue({
      srcURL: 'oldSrcURL',
      avatarBlob: new Blob(),
      uuid: 'testUUID',
    });
    const downloadAvatarMock = vi.fn().mockResolvedValue(new Blob());
    const saveAvatarToDatabaseMock = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAvatar({
        avatarSrcURL: 'newSrcURL',
        deleteDatabaseAvatar: vi.fn(),
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalledTimes(1);
      expect(downloadAvatarMock).toHaveBeenCalledTimes(1);
      expect(saveAvatarToDatabaseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('When the avatar is still valid, then it should not update the database and return de cached one', async () => {
    const getDatabaseAvatarMock = vi.fn().mockResolvedValue({
      srcURL: 'currentSrcURL',
      avatarBlob: new Blob(),
      uuid: 'testUUID',
    });
    const downloadAvatarMock = vi.fn();
    const saveAvatarToDatabaseMock = vi.fn();

    renderHook(() =>
      useAvatar({
        avatarSrcURL: 'currentSrcURL',
        deleteDatabaseAvatar: vi.fn(),
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalled();
      expect(downloadAvatarMock).not.toHaveBeenCalled();
      expect(saveAvatarToDatabaseMock).not.toHaveBeenCalled();
    });
  });

  it('When an unexpected error occurs, then a notification is shown', async () => {
    const getDatabaseAvatarMock = vi.fn().mockRejectedValue(new Error('Unexpected error'));
    const downloadAvatarMock = vi.fn();
    const saveAvatarToDatabaseMock = vi.fn();
    const notificationServiceSpy = vi.spyOn(notificationsService, 'show');

    renderHook(() =>
      useAvatar({
        avatarSrcURL: 'currentSrcURL',
        deleteDatabaseAvatar: vi.fn(),
        downloadAvatar: downloadAvatarMock,
        getDatabaseAvatar: getDatabaseAvatarMock,
        saveAvatarToDatabase: saveAvatarToDatabaseMock,
      }),
    );

    await waitFor(() => {
      expect(getDatabaseAvatarMock).toHaveBeenCalled();
      expect(downloadAvatarMock).not.toHaveBeenCalled();
      expect(saveAvatarToDatabaseMock).not.toHaveBeenCalled();

      expect(notificationServiceSpy).toHaveBeenCalledTimes(1);
    });
  });
});
