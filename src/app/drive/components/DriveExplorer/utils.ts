import { Role } from '@internxt/sdk/dist/drive/share/types';
import errorService from '../../../core/services/error.service';
import workspacesService from '../../../core/services/workspace.service';
import { DriveItemData } from '../../types';

/**
 * Share an item with a team in the selected workspace.
 *
 * @param {WorkspaceId} selectedWorkspaceId - The workspace id where the item will be shared.
 * @param {DriveItemData} driveItem - The item to be shared.
 * @param {TeamId} selectedTeamId - The team id where the item will be shared.
 * @param {Role} role - The role assigned for sharing.
 * @return {Promise<boolean>} A boolean indicating the success of sharing the item.
 */
export const shareItemWithTeamV2 = async (
  workspaceId: string,
  driveItem: DriveItemData,
  teamId: string,
  role: Role,
): Promise<boolean> => {
  try {
    await workspacesService.shareItemWithTeam({
      workspaceId: workspaceId,
      itemId: driveItem.uuid,
      itemType: driveItem.isFolder ? 'folder' : 'file',
      teamUUID: teamId,
      // ADDED EDITOR ROLE BY DEFAULT
      roleId: role?.id,
    });
    return true;
  } catch (error) {
    errorService.reportError(error, {
      extra: {
        workspaceId: workspaceId,
        itemUUID: driveItem.uuid,
        teamUUID: teamId,
        roleId: role?.id,
      },
    });
    return false;
  }
};
