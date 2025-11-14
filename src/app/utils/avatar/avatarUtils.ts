import userService from '../../auth/services/user.service';
import { updateDatabaseProfileAvatar, deleteDatabaseProfileAvatar } from 'app/drive/services/database.service';

async function refreshAvatar(uuid: string): Promise<string | null> {
  const { avatar: updatedUserAvatar } = await userService.refreshAvatarUser();
  if (!updatedUserAvatar) {
    await deleteDatabaseProfileAvatar();
    return null;
  }

  const avatarBlob = await userService.downloadAvatar(updatedUserAvatar);

  await updateDatabaseProfileAvatar({
    sourceURL: updatedUserAvatar,
    avatarBlob,
    uuid,
  });

  return updatedUserAvatar;
}

export { refreshAvatar };
