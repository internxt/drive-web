import { memo } from 'react';
import { updateDatabaseProfileAvatar } from 'app/drive/services/database.service';
import { Avatar } from '@internxt/ui';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

export const showUpdateAvatarErrorToast = () =>
  notificationsService.show({
    text: t('error.updateAvatarError'),
    type: ToastType.Error,
  });

export const extractAvatarURLID = (url: string): string | null => {
  const regex = /internxt\.com\/(.*?)[?&]/;
  const match = regex.exec(url);
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
    return <Avatar diameter={diameter} fullName={fullName} src={avatarSrcURL} style={style} />;
  },
);

export default AvatarWrapper;
