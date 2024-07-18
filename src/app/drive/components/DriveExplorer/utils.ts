import { Role } from '@internxt/sdk/dist/drive/share/types';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import errorService from '../../../core/services/error.service';
import workspacesService from '../../../core/services/workspace.service';
import { DriveItemData } from '../../types';

/**
 * Share an item with a team in the selected workspace.
 *
 * @param {DriveItemData} driveItem - The item to be shared.
 * @param {WorkspaceData} selectedWorkspace - The workspace where the item will be shared.
 * @param {Role} role - The role assigned for sharing.
 * @return {Promise<boolean>} A boolean indicating the success of sharing the item.
 */
export const shareItemWithTeam = async (
  driveItem: DriveItemData,
  selectedWorkspace: WorkspaceData,
  role: Role,
): Promise<boolean> => {
  try {
    await workspacesService.shareItemWithTeam({
      workspaceId: selectedWorkspace?.workspace?.id,
      itemId: driveItem.uuid,
      itemType: driveItem.isFolder ? 'folder' : 'file',
      teamUUID: selectedWorkspace?.workspace.defaultTeamId,
      // ADDED EDITOR ROLE BY DEFAULT
      roleId: role?.id,
    });
    return true;
  } catch (error) {
    errorService.reportError(error, {
      extra: {
        workspaceData: selectedWorkspace,
        itemUUID: driveItem.uuid,
        roleId: role?.id,
      },
    });
    return false;
  }
};
