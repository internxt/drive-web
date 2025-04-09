import { getDatabaseProfileAvatar, updateDatabaseProfileAvatar } from '../../drive/services/database.service';
import { isAvatarExpired } from './avatarUtils';
import userService from '../../auth/services/user.service';

export async function syncAvatarIfNeeded(uuid: string, avatarUrl: string | null): Promise<void> {
  if (!avatarUrl) return;

  const storedUserAvatar = await getDatabaseProfileAvatar();

  const shouldUpdate = !storedUserAvatar?.srcURL || isAvatarExpired(storedUserAvatar.srcURL);

  if (!shouldUpdate) return;

  const avatarBlob = await userService.downloadAvatar(avatarUrl);

  await updateDatabaseProfileAvatar({
    sourceURL: avatarUrl,
    avatarBlob,
    uuid,
  });
}
