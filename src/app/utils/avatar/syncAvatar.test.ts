import { describe, it, vi, expect, beforeEach, Mock } from 'vitest';
import { syncAvatarIfNeeded } from './syncAvatar';
import userService from '../../auth/services/user.service';
import { getDatabaseProfileAvatar, updateDatabaseProfileAvatar } from '../../drive/services/database.service';
import { isAvatarExpired } from './avatarUtils';

vi.mock('./avatarUtils', () => ({
  isAvatarExpired: vi.fn(),
}));

vi.mock('../../drive/services/database.service', async () => {
  const actual = await vi.importActual<typeof import('../../drive/services/database.service')>(
    '../../drive/services/database.service',
  );

  return {
    ...actual,
    getDatabaseProfileAvatar: vi.fn(),
    updateDatabaseProfileAvatar: vi.fn(),
  };
});

vi.mock('../../auth/services/user.service', async () => ({
  default: {
    downloadAvatar: vi.fn(),
  },
}));

describe('Sync avatar if needed', () => {
  const uuid = '1234';
  const avatarUrl = 'https://url.com/avatar.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('When no avatar URL is provided, then it should not update the database', async () => {
    await syncAvatarIfNeeded(uuid, '');
    expect(getDatabaseProfileAvatar).not.toHaveBeenCalled();
    expect(updateDatabaseProfileAvatar).not.toHaveBeenCalled();
  });

  it('When no avatar is stored, then it should download and update the database with the new one', async () => {
    (getDatabaseProfileAvatar as Mock).mockResolvedValue(undefined);
    (isAvatarExpired as Mock).mockReturnValue(false);
    vi.spyOn(userService, 'downloadAvatar').mockResolvedValue(new Blob(['data']));

    await syncAvatarIfNeeded(uuid, avatarUrl);

    expect(updateDatabaseProfileAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceURL: avatarUrl,
        uuid,
      }),
    );
  });

  it('When the stored avatar is expired, then it should update the database', async () => {
    (getDatabaseProfileAvatar as Mock).mockResolvedValue({
      srcURL: avatarUrl,
    });
    (isAvatarExpired as Mock).mockReturnValue(true);
    vi.spyOn(userService, 'downloadAvatar').mockResolvedValue(new Blob(['data']));

    await syncAvatarIfNeeded(uuid, avatarUrl);

    expect(updateDatabaseProfileAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceURL: avatarUrl,
        uuid,
      }),
    );
  });

  it('When the stored avatar is still valid, then it should not update the database', async () => {
    (getDatabaseProfileAvatar as Mock).mockResolvedValue({
      srcURL: avatarUrl,
    });
    (isAvatarExpired as Mock).mockReturnValue(false);

    await syncAvatarIfNeeded(uuid, avatarUrl);

    expect(updateDatabaseProfileAvatar).not.toHaveBeenCalled();
  });
});
