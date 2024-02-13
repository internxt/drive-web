import errorService from '../../../core/services/error.service';
import shareService from '../../services/share.service';
import { AdvancedSharedItem, UserRoles } from '../../types';

/**
 * Checks if the current user role is that of a reader.
 *
 * @param {string | null} currentUserRole - The role of the current user.
 * @returns {boolean} - Returns true if the current user has the role of a reader, otherwise returns false.
 */
const isCurrentUserViewer = (currentUserRole: string | null) => {
  return currentUserRole === UserRoles.Reader;
};

/**
 * Checks if the provided user UUID matches the owner's UUID of a given item.
 *
 * @param {string | undefined} currentUserUUID - The UUID of the current user.
 * @param {string | undefined} itemUserUUID - The UUID of the item's owner.
 * @returns {boolean} Returns true if the current user owns the item, otherwise false.
 */
const isItemOwnedByCurrentUser = (currentUserUUID?: string, itemUserUUID?: string) => {
  if (currentUserUUID && itemUserUUID) {
    return currentUserUUID === itemUserUUID;
  }
  return false;
};

/**
 * Checks if the selected items are owned by the current user.
 *
 * @param {Array} selectedItems - The array of selected items.
 * @param {string} [currentUserUUID] - The UUID of the current user.
 * @param {string} [clickedItemUserUUID] - The UUID of the user who owns the clicked item.
 *
 * @returns {boolean} - Returns true if the selected items are owned by the current user, otherwise returns false.
 */
const isItemsOwnedByCurrentUser = (
  selectedItems: AdvancedSharedItem[],
  currentUserUUID?: string,
  clickedItemUserUUID?: string,
) => {
  if (currentUserUUID && selectedItems && selectedItems.length > 1) {
    const isOwner = selectedItems.some((itemOwner) => {
      const userUuid = itemOwner.user?.uuid ?? clickedItemUserUUID;
      return currentUserUUID === userUuid;
    });

    return isOwner;
  }

  return false;
};

/**
 * Fetch the user role of a specific shared folder.
 *
 * @async
 * @param {Object} params - Function parameters.
 * @param {string} params.sharingId - Identifier of the shared folder.
 * @param {function} params.onObtainUserRoleCallback - Function that returns the user role (roleName: string) => void.
 *
 * @returns {Promise<void>} - A promise that resolves when the role assignment is complete.
 */
const getFolderUserRole = async ({
  sharingId,
  onObtainUserRoleCallback,
}: {
  sharingId: string;
  onObtainUserRoleCallback: (roleName: string) => void;
}) => {
  try {
    const role = await shareService.getUserRoleOfSharedFolder(sharingId);
    if (role.name) onObtainUserRoleCallback(role.name.toLowerCase());
  } catch (error) {
    errorService.reportError(error);
  }
};

export { isCurrentUserViewer, isItemsOwnedByCurrentUser, getFolderUserRole, isItemOwnedByCurrentUser };
