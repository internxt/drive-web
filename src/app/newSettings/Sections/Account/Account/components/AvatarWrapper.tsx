import { memo, useEffect, useState } from 'react';
import {
  deleteDatabaseProfileAvatar,
  getDatabaseProfileAvatar,
  updateDatabaseProfileAvatar,
} from '../../../../../drive/services/database.service';
import * as Sentry from '@sentry/react';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { Avatar } from '@internxt/ui';

export const extractAvatarURLID = (url: string): string | null => {
  const regex = /internxt\.com\/(.*?)[?&]/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const showUpdateProfilePhotoErrorToast = () =>
  notificationsService.show({
    text: 'Error updating profile photo',
    type: ToastType.Error,
  });

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
    const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

    useEffect(() => {
      const handleAvatarData = async () => {
        try {
          if (avatarSrcURL) {
            await handleDownload(avatarSrcURL);
            return;
          }
          deleteDatabaseProfileAvatar();
          setAvatarBlob(null);
        } catch (error) {
          Sentry.captureException(error, {
            extra: {
              avatarURL: avatarSrcURL,
            },
          });
          showUpdateProfilePhotoErrorToast();
          setAvatarBlob(null);
        }
      };

      handleAvatarData();
    }, [avatarSrcURL]);

    const downloadAndSaveAvatar = async (url: string) => {
      const response = await fetch(url);
      const data = await response.blob();
      setAvatarBlob(data);
      await saveAvatarToDatabase(url, data);
    };

    const handleDownload = async (url: string) => {
      const databaseAvatarData = await getDatabaseProfileAvatar();

      if (!databaseAvatarData) {
        downloadAndSaveAvatar(url);
        return;
      }

      const existsNewAvatar = databaseAvatarData.uuid !== extractAvatarURLID(url);

      if (existsNewAvatar) {
        return downloadAndSaveAvatar(url);
      }

      setAvatarBlob(databaseAvatarData.avatarBlob);
    };

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
