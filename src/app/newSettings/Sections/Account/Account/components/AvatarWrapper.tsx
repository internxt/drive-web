import { memo } from 'react';
import {
  deleteDatabaseProfileAvatar,
  getDatabaseProfileAvatar,
  updateDatabaseProfileAvatar,
} from '../../../../../drive/services/database.service';
import { Avatar } from '@internxt/ui';
import userService from 'app/auth/services/user.service';
import { useAvatar } from 'hooks/useAvatar';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

export const showUpdateAvatarErrorToast = () =>
  notificationsService.show({
    text: t('error.updateAvatarError'),
    type: ToastType.Error,
  });

export const extractAvatarURLID = (url: string): string | null => {
  const regex = /internxt\.com\/(.*?)[?&]/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const saveAvatarToDatabase = async (url: string, avatar: Blob): Promise<void> => {
  const uuid = extractAvatarURLID(url);
  return await updateDatabaseProfileAvatar({
    sourceURL: url,
    avatarBlob: avatar,
    uuid: uuid ?? '',
  });
};

const AvatarWrapper = memo(
  ({
    avatarSrcURL,
    fullName,
    diameter,
    style,
  }: {
    avatarSrcURL: string | null;
    fullName: string;
    diameter: number;
    style?: Record<string, string | number>;
  }): JSX.Element => {
    const { avatarBlob } = useAvatar({
      avatarSrcURL,
      deleteDatabaseAvatar: deleteDatabaseProfileAvatar,
      downloadAvatar: userService.downloadAvatar,
      getDatabaseAvatar: getDatabaseProfileAvatar,
      saveAvatarToDatabase: saveAvatarToDatabase,
      onError: showUpdateAvatarErrorToast,
    });

    return (
      <Avatar
        diameter={diameter}
        fullName={fullName}
        src={avatarBlob ? URL.createObjectURL(avatarBlob) : null}
        style={style}
      />
    );
  },
);

export default AvatarWrapper;
