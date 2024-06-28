import { memo, useEffect, useState } from 'react';
import {
  deleteDatabaseWorkspaceAvatar,
  getDatabaseWorkspaceAvatar,
  updateDatabaseWorkspaceAvatar,
} from '../../../../../drive/services/database.service';
import Avatar from '../../../../../shared/components/Avatar';
import * as Sentry from '@sentry/react';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';

const extractAvatarURLID = (url: string): string | null => {
  const regex = /internxt\.com\/(.*?)[?&]/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const showUpdateWorkspaceAvatarErrorToast = () =>
  notificationsService.show({
    text: 'Error updating workspace avatar photo',
    type: ToastType.Error,
  });

export const saveWorkspaceAvatarToDatabase = async (url: string, avatar: Blob): Promise<void> => {
  const uuid = extractAvatarURLID(url);
  return await updateDatabaseWorkspaceAvatar({
    sourceURL: url,
    avatarBlob: avatar,
    uuid: uuid ?? '',
  });
};

export const deleteWorkspaceAvatarFromDatabase = async (url: string): Promise<void> => {
  const uuid = extractAvatarURLID(url);
  return await deleteDatabaseWorkspaceAvatar(uuid ?? '');
};

const WorkspaceAvatarWrapper = memo(
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
    const uuid = extractAvatarURLID(avatarSrcURL || '') || '';

    useEffect(() => {
      const handleAvatarData = async () => {
        try {
          if (avatarSrcURL) {
            await handleDownload(avatarSrcURL);
            return;
          }
          if (uuid && uuid.length > 0) deleteDatabaseWorkspaceAvatar(uuid);
          setAvatarBlob(null);
        } catch (error) {
          Sentry.captureException(error, {
            extra: {
              workspaceAvatarURL: avatarSrcURL,
            },
          });
          showUpdateWorkspaceAvatarErrorToast();
          setAvatarBlob(null);
        }
      };

      handleAvatarData();
    }, [avatarSrcURL]);

    const downloadAndSaveAvatar = async (url: string) => {
      const response = await fetch(url);
      const data = await response.blob();
      setAvatarBlob(data);
      await saveWorkspaceAvatarToDatabase(url, data);
    };

    const handleDownload = async (url: string) => {
      const databaseAvatarData = await getDatabaseWorkspaceAvatar(uuid);

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

export default WorkspaceAvatarWrapper;
