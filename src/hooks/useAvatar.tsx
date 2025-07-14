import { useEffect, useCallback, useState } from 'react';
import { AvatarBlobData } from 'app/database/services/database.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';

type UseAvatarManagerProps = {
  avatarSrcURL: string | null;
  getDatabaseAvatar: () => Promise<AvatarBlobData | undefined>;
  saveAvatarToDatabase: (url: string, blob: Blob) => Promise<void>;
  deleteDatabaseAvatar: () => Promise<void>;
  downloadAvatar: (url: string) => Promise<Blob>;
};

const showUpdateAvatarErrorToast = () =>
  notificationsService.show({
    text: t('error.updateAvatarError'),
    type: ToastType.Error,
  });

export const useAvatar = ({
  avatarSrcURL,
  getDatabaseAvatar,
  saveAvatarToDatabase,
  deleteDatabaseAvatar,
  downloadAvatar,
}: UseAvatarManagerProps) => {
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  const downloadAndSaveAvatar = useCallback(
    async (url: string) => {
      const avatar = await downloadAvatar(url);
      setAvatarBlob(avatar);
      await saveAvatarToDatabase(url, avatar);
    },
    [downloadAvatar, saveAvatarToDatabase],
  );

  const handleDownload = useCallback(
    async (url: string) => {
      const databaseAvatarData = await getDatabaseAvatar().catch();

      if (!databaseAvatarData) {
        return downloadAndSaveAvatar(url);
      }

      const existsNewAvatar = databaseAvatarData.srcURL !== url;

      if (existsNewAvatar) {
        return downloadAndSaveAvatar(url);
      }

      setAvatarBlob(databaseAvatarData.avatarBlob);
    },
    [getDatabaseAvatar, downloadAndSaveAvatar],
  );

  useEffect(() => {
    const handleAvatarData = async () => {
      try {
        if (avatarSrcURL) {
          return handleDownload(avatarSrcURL);
        }

        await deleteDatabaseAvatar();
        setAvatarBlob(null);
      } catch (error) {
        showUpdateAvatarErrorToast();
        setAvatarBlob(null);
      }
    };

    handleAvatarData();
  }, [avatarSrcURL]);

  return { avatarBlob };
};
