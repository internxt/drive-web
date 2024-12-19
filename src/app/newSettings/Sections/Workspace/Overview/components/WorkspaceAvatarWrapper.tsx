import { memo, useEffect, useState } from 'react';
import {
  deleteDatabaseWorkspaceAvatar,
  getDatabaseWorkspaceAvatar,
  updateDatabaseWorkspaceAvatar,
} from '../../../../../drive/services/database.service';
import * as Sentry from '@sentry/react';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { Avatar } from '@internxt/ui';

const showUpdateWorkspaceAvatarErrorToast = () =>
  notificationsService.show({
    text: 'Error updating workspace avatar photo',
    type: ToastType.Error,
  });

export const saveWorkspaceAvatarToDatabase = async (workspaceId: string, url: string, avatar: Blob): Promise<void> => {
  return await updateDatabaseWorkspaceAvatar({
    sourceURL: url,
    avatarBlob: avatar,
    uuid: workspaceId,
  });
};

export const deleteWorkspaceAvatarFromDatabase = async (workspaceId: string): Promise<void> => {
  return await deleteDatabaseWorkspaceAvatar(workspaceId);
};

const WorkspaceAvatarWrapper = memo(
  ({
    workspaceId,
    avatarSrcURL,
    fullName,
    diameter,
    style,
  }: {
    workspaceId: string;
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
          if (avatarSrcURL && avatarSrcURL.length > 0) deleteDatabaseWorkspaceAvatar(workspaceId);
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
      await saveWorkspaceAvatarToDatabase(workspaceId, url, data);
    };

    const handleDownload = async (url: string) => {
      const databaseAvatarData = await getDatabaseWorkspaceAvatar(workspaceId).catch();

      if (!databaseAvatarData) {
        downloadAndSaveAvatar(url);
        return;
      }

      const existsNewAvatar = databaseAvatarData.srcURL !== url;

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
