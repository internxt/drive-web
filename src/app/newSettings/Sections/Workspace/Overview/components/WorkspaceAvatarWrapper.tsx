import { Avatar } from '@internxt/ui';
import userService from 'app/auth/services/user.service';
import { memo } from 'react';
import {
  deleteDatabaseWorkspaceAvatar,
  getDatabaseWorkspaceAvatar,
  updateDatabaseWorkspaceAvatar,
} from '../../../../../drive/services/database.service';
import { useAvatar } from 'hooks/useAvatar';
import { showUpdateAvatarErrorToast } from 'app/newSettings/Sections/Account/Account/components/AvatarWrapper';

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
    const { avatarBlob } = useAvatar({
      avatarSrcURL,
      getDatabaseAvatar: () => getDatabaseWorkspaceAvatar(workspaceId),
      saveAvatarToDatabase: (url, blob) => saveWorkspaceAvatarToDatabase(workspaceId, url, blob),
      deleteDatabaseAvatar: () => deleteDatabaseWorkspaceAvatar(workspaceId),
      downloadAvatar: userService.downloadAvatar,
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

export default WorkspaceAvatarWrapper;
