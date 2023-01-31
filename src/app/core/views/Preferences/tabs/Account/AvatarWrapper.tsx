import dayjs from 'dayjs';
import { memo, useEffect, useState } from 'react';
import { deleteDatabaseProfileAvatar, getDatabaseProfileAvatar } from '../../../../../drive/services/database.service';
import Avatar from '../../../../../shared/components/Avatar';
import { useAppDispatch } from '../../../../../store/hooks';
import { updateUserAvatarThunk } from '../../../../../store/slices/user';
import dateService from '../../../../services/date.service';

export const extractExpiresValue = (url: string): number | null => {
  const regex = /Expires=(\d+)/;
  const match = url.match(regex);
  return match ? parseInt(match[1]) : null;
};

export const extractAvatarURLID = (url: string): string | null => {
  const regex = /internxt\.com\/(.*?)[?&]/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const checkIsAvatarURLExpired = (url) => {
  const expiresValue = extractExpiresValue(url);
  if (!expiresValue) return false;

  const expirationDate = dateService.getExpirationDate(expiresValue);
  return dayjs().isAfter(expirationDate);
};

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
        if (avatarSrcURL) {
          await handleDownload(avatarSrcURL);
          return;
        }
        deleteDatabaseProfileAvatar();
        setAvatarBlob(null);
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

      const existsNewAvatar =
        !!databaseAvatarData && extractAvatarURLID(databaseAvatarData?.srcURL) !== extractAvatarURLID(url);
      const hasAvatarExpired = checkIsAvatarURLExpired(url);

      if (existsNewAvatar || hasAvatarExpired) {
        return downloadAndSaveAvatar(url);
      }

      setAvatarBlob(databaseAvatarData.avatarBlob);
    };

    return <Avatar diameter={diameter} fullName={fullName} src={avatarBlob ? URL.createObjectURL(avatarBlob) : null} />;
  },
);

export default AvatarWrapper;
