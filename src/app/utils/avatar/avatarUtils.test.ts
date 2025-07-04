import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import userService from '../../auth/services/user.service';
import { getAvatarExpiration, isAvatarExpired, syncAvatarIfNeeded } from './avatarUtils';
import { getDatabaseProfileAvatar, updateDatabaseProfileAvatar } from '../../drive/services/database.service';

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

vi.mock('../../auth/services/user.service', () => ({
  default: {
    downloadAvatar: vi.fn(),
  },
}));

describe('Get avatar expiration date from URL', () => {
  it('When the Avatar URL is fetched, then the expiration date is obtained', () => {
    const url = 'https://avatar-url.com/file.png?X-Amz-Date=20250409T073000Z&X-Amz-Expires=3600';
    const expected = new Date(Date.UTC(2025, 3, 9, 8, 30, 0));

    expect(getAvatarExpiration(url)?.getTime()).toBe(expected.getTime());
  });

  it('When the params are missing, then nothing returns', () => {
    const url = 'https://avatar-url.com/file.png';
    expect(getAvatarExpiration(url)).toBeNull();
  });
});

describe('Check if avatar URL is expired or not', () => {
  it('When the avatar is not expired, then false is returned', () => {
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/[:-]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace('Z', '');

    const url = `https://avatar-url.com/file.png?X-Amz-Date=${dateStr}Z&X-Amz-Expires=3600`;

    expect(isAvatarExpired(url)).toBe(false);
  });

  it('When the avatar is expired, then true is returned', () => {
    const url = 'https://avatar-url.com/file.png?X-Amz-Date=20200101T000000Z&X-Amz-Expires=60';
    expect(isAvatarExpired(url)).toBe(true);
  });

  it('When there are missing params, then true is returned', () => {
    const url = 'https://avatar-url.com/file.png';
    expect(isAvatarExpired(url)).toBe(true);
  });
});

describe('Sync avatar if needed', () => {
  const uuid = 'mocked-user-id';
  const avatarUrl = 'https://avatar-url.com/file.png?X-Amz-Date=20200101T000000Z&X-Amz-Expires=60';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('When no avatar URL is provided, then it should not update the database', async () => {
    await syncAvatarIfNeeded(uuid, '');
    expect(getDatabaseProfileAvatar).not.toHaveBeenCalled();
    expect(updateDatabaseProfileAvatar).not.toHaveBeenCalled();
  });

  it('When no avatar is stored, then it should download and update the database with the new one', async () => {
    (getDatabaseProfileAvatar as Mock).mockResolvedValue(undefined);
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
    (getDatabaseProfileAvatar as Mock).mockResolvedValueOnce({ srcURL: avatarUrl });
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
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/[:-]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace('Z', '');

    const url = `https://avatar-url.com/file.png?X-Amz-Date=${dateStr}Z&X-Amz-Expires=3600`;
    (getDatabaseProfileAvatar as Mock).mockResolvedValueOnce({ srcURL: url });

    await syncAvatarIfNeeded(uuid, url);

    expect(updateDatabaseProfileAvatar).not.toHaveBeenCalled();
  });
});
