import { memo, useEffect, useState } from 'react';
import { deleteDatabaseProfileAvatar, getDatabaseProfileAvatar } from '../../../../../drive/services/database.service';
import Avatar from '../../../../../shared/components/Avatar';
import { useAppDispatch } from '../../../../../store/hooks';
import { updateUserAvatarThunk } from '../../../../../store/slices/user';
import * as Sentry from '@sentry/react';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';

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

const AvatarWrapper = memo(
  ({
    avatarSrcURL,
    fullName,
    diameter,
  }: {
    avatarSrcURL: string | null;
    fullName: string;
    diameter: number;
  }): JSX.Element => {
    const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

    const dispatch = useAppDispatch();

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
      await dispatch(updateUserAvatarThunk({ avatar: data })).unwrap();
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

    return <Avatar diameter={diameter} fullName={fullName} src={avatarBlob ? URL.createObjectURL(avatarBlob) : null} />;
  },
);

export default AvatarWrapper;
