import { beforeEach, describe, expect, test, vi } from 'vitest';
import userService from 'app/auth/services/user.service';
import { refreshAvatar } from './avatarUtils';
import { updateDatabaseProfileAvatar, deleteDatabaseProfileAvatar } from 'app/drive/services/database.service';

vi.mock('app/drive/services/database.service', async () => {
  const actual = await vi.importActual<typeof import('app/drive/services/database.service')>(
    'app/drive/services/database.service',
  );

  return {
    ...actual,
    updateDatabaseProfileAvatar: vi.fn(),
    deleteDatabaseProfileAvatar: vi.fn(),
  };
});

vi.mock('app/auth/services/user.service', () => ({
  default: {
    downloadAvatar: vi.fn(),
    refreshAvatarUser: vi.fn(),
  },
}));

describe('refreshAvatar', () => {
  const uuid = 'mocked-user-id';
  const newAvatarUrl = 'https://avatar.new-url.com/avatar.png';
  const avatarBlob = new Blob(['mocked-avatar']);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When no avatar is returned from refresh, then it should delete from database and return null', async () => {
    vi.spyOn(userService, 'refreshAvatarUser').mockResolvedValue({ avatar: null });

    const result = await refreshAvatar(uuid);

    expect(result).toBeNull();
    expect(deleteDatabaseProfileAvatar).toHaveBeenCalled();
    expect(updateDatabaseProfileAvatar).not.toHaveBeenCalled();
    expect(userService.downloadAvatar).not.toHaveBeenCalled();
  });

  test('When avatar is returned, then it should download, update database and return the URL', async () => {
    vi.spyOn(userService, 'refreshAvatarUser').mockResolvedValue({ avatar: newAvatarUrl });
    vi.spyOn(userService, 'downloadAvatar').mockResolvedValue(avatarBlob);

    const result = await refreshAvatar(uuid);

    expect(result).toBe(newAvatarUrl);
    expect(userService.refreshAvatarUser).toHaveBeenCalled();
    expect(userService.downloadAvatar).toHaveBeenCalledWith(newAvatarUrl);
    expect(updateDatabaseProfileAvatar).toHaveBeenCalledWith({
      sourceURL: newAvatarUrl,
      avatarBlob,
      uuid,
    });
    expect(deleteDatabaseProfileAvatar).not.toHaveBeenCalled();
  });
});
