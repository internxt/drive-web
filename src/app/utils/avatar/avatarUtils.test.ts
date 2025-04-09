import { describe, expect, it } from 'vitest';
import { getAvatarExpiration, isAvatarExpired } from './avatarUtils';

describe('Get avatar expiration date from URL', () => {
  it('When the Avatar URL is fetched, then the expiration date is obtained', () => {
    const url = 'https://s3.wasabisys.com/avatars.internxt.com/file.png?X-Amz-Date=20250409T073000Z&X-Amz-Expires=3600';
    const expected = new Date(Date.UTC(2025, 3, 9, 8, 30, 0)); // 2025-04-09T08:30:00Z

    expect(getAvatarExpiration(url)?.getTime()).toBe(expected.getTime());
  });

  it('When the params are missing, then nothing returns', () => {
    const url = 'https://s3.wasabisys.com/avatars.internxt.com/file.png';
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

    const url = `https://s3.wasabisys.com/file.png?X-Amz-Date=${dateStr}Z&X-Amz-Expires=3600`;

    expect(isAvatarExpired(url)).toBe(false);
  });

  it('When the avatar is expired, then true is returned', () => {
    const url = 'https://s3.wasabisys.com/avatars.internxt.com/file.png?X-Amz-Date=20200101T000000Z&X-Amz-Expires=60';
    expect(isAvatarExpired(url)).toBe(true);
  });

  it('When there are missing params, then true is returned', () => {
    const url = 'https://s3.wasabisys.com/avatars.internxt.com/file.png';
    expect(isAvatarExpired(url)).toBe(true);
  });
});
