import { useEffect, useCallback, useState, useRef } from 'react';
import { AvatarBlobData } from 'app/database/services/database.service';

type UseAvatarManagerProps = {
  avatarSrcURL: string | null;
  getDatabaseAvatar: () => Promise<AvatarBlobData | undefined>;
  saveAvatarToDatabase: (url: string, blob: Blob) => Promise<void>;
  deleteDatabaseAvatar: () => Promise<void>;
  downloadAvatar: (url: string, signal?: AbortSignal) => Promise<Blob>;
  onError: () => void;
};

export const useAvatar = ({
  avatarSrcURL,
  getDatabaseAvatar,
  saveAvatarToDatabase,
  deleteDatabaseAvatar,
  downloadAvatar,
  onError,
}: UseAvatarManagerProps) => {
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const downloadAndSaveAvatar = useCallback(
    async (url: string, signal?: AbortSignal) => {
      const avatar = await downloadAvatar(url, signal);
      setAvatarBlob(avatar);
      await saveAvatarToDatabase(url, avatar);
    },
    [downloadAvatar, saveAvatarToDatabase],
  );

  const handleDownload = useCallback(
    async (url: string, signal?: AbortSignal) => {
      const databaseAvatarData = await getDatabaseAvatar().catch();

      if (!databaseAvatarData) {
        return downloadAndSaveAvatar(url, signal);
      }

      if (signal?.aborted) return;

      setAvatarBlob(databaseAvatarData.avatarBlob);
    },
    [getDatabaseAvatar, downloadAndSaveAvatar],
  );

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const handleAvatarData = async () => {
      try {
        if (avatarSrcURL) {
          await handleDownload(avatarSrcURL, abortController.signal);
          return;
        }

        if (!abortController.signal.aborted) {
          await deleteDatabaseAvatar();
          setAvatarBlob(null);
        }
      } catch {
        if (!abortController.signal.aborted) {
          onError();
          setAvatarBlob(null);
        }
      }
    };

    handleAvatarData();
    return () => {
      abortController.abort();
    };
  }, [avatarSrcURL]);

  return { avatarBlob };
};
