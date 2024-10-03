import errorService from '../../../core/services/error.service';
import shareService from '../../services/share.service';
import { AdvancedSharedItem, UserRoles } from '../../types';
import { OrderField } from './components/SharedItemList';

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

/**
 * Parse the specified field of an AdvancedSharedItem.
 *
 * @param {AdvancedSharedItem} item - The item to parse.
 * @param {OrderField} field - The item field to parse.
 * @returns {number | string} - The parsed value.
 */
const parseField = (item: AdvancedSharedItem, field: OrderField): number | string => {
  const isSizeField = field === 'size';
  return isSizeField ? parseFloat(item[field]) : String(item[field]).toLowerCase();
};

/**
 * Compare function for sorting AdvancedSharedItems based on the provided orderBy configuration.
 *
 * @param {AdvancedSharedItem} itemA - The first item to compare.
 * @param {AdvancedSharedItem} itemB - The second item to compare.
 * @param {{ field: OrderField; direction: 'ASC' | 'DESC' } | undefined} orderBy - The ordering configuration.
 * @returns {number} - Result of the comparison.
 */
const compareFunction = (
  itemA: AdvancedSharedItem,
  itemB: AdvancedSharedItem,
  orderBy?: { field: OrderField; direction: 'ASC' | 'DESC' },
): number => {
  if (!orderBy) return 0;

  const isOnlyItemAFolder = itemA.isFolder && !itemB.isFolder;
  const isOnlyItemBFolder = !itemA.isFolder && itemB.isFolder;

  if (isOnlyItemAFolder) {
    return -1;
  } else if (isOnlyItemBFolder) {
    return 1;
  }

  const valueA = parseField(itemA, orderBy.field);
  const valueB = parseField(itemB, orderBy.field);

  if (valueA === valueB) {
    return 0;
  }

  const ascOrderResult = valueA > valueB ? 1 : -1;
  const descOrderResult = valueA < valueB ? 1 : -1;
  return orderBy.direction === 'ASC' ? ascOrderResult : descOrderResult;
};

/**
 * Sorts a list of AdvancedSharedItems based on the provided orderBy configuration.
 *
 * @param {AdvancedSharedItem[]} itemList - The list of items to be sorted.
 * @param {{ field: OrderField; direction: 'ASC' | 'DESC' } | undefined} orderBy - The ordering configuration.
 * @returns {AdvancedSharedItem[]} - The sorted list of items.
 */
const sortSharedItems = (
  itemList: AdvancedSharedItem[],
  orderBy?: { field: OrderField; direction: 'ASC' | 'DESC' },
): AdvancedSharedItem[] => {
  return [...itemList].sort((a, b) => compareFunction(a, b, orderBy));
};

/**
 * Determines whether a user is the owner of an item.
 *
 * @param {Object} param - Input parameters for the function.
 * @param {boolean} [param.isDriveItem] - Indicates whether the item is a drive item.
 * @param {AdvancedSharedItem} [param.item] - AdvancedShareItem item.
 * @param {string} param.userEmail - Current account user email.
 * @returns {boolean} - Returns true if the user is the owner of the item, false otherwise.
 */
const isUserItemOwner = ({
  isDriveItem,
  item,
  userEmail,
}: {
  isDriveItem?: boolean;
  item?: AdvancedSharedItem;
  userEmail: string;
}): boolean => {
  if (isDriveItem) return true;
  if (!item) return false;

  const itemOwnerEmail = item.user?.email;
  const isUserOwner = itemOwnerEmail === userEmail;

  return isUserOwner;
};

/**
 * Get the items filtered when dragged, removing the folders in case the user has the role of EDITOR
 * @param {DataTransferItem[]} draggedItemsList - All dragged items into a folder
 * @param {boolean} hasFolder - Used to display a notification to the user in case he tries to upload a folder as EDITOR
 * @returns {File[]} An array of files ready to upload
 */
const getDraggedItemsWithoutFolders = async (draggedItemsList: DataTransferItem[]) => {
  let hasFolders = false;
  let loadedFiles;

  const removeFoldersFromDroppedItems = draggedItemsList.filter((item: DataTransferItem) => {
    const entry = item.webkitGetAsEntry?.();

    if (entry?.isDirectory) {
      hasFolders = true;
    }

    return entry?.isFile;
  });

  try {
    const filesPromises = removeFoldersFromDroppedItems.map((item: DataTransferItem) => {
      const entry = item.webkitGetAsEntry() as FileSystemFileEntry;

      return getFilePromises(entry);
    });

    loadedFiles = (await Promise.all(filesPromises)).filter((file): file is File => file !== null);
  } catch (error) {
    loadedFiles = [];
    hasFolders = false;
  }

  return {
    filteredItems: loadedFiles,
    hasFolders,
  };
};

const getFilePromises = (entry: FileSystemFileEntry) => {
  return new Promise<File | null>((resolve, reject) => {
    entry.file(
      (file: File) => resolve(file),
      () => reject(new Error('Error loading files')),
    );
  });
};

export {
  isCurrentUserViewer,
  isItemsOwnedByCurrentUser,
  getFolderUserRole,
  isItemOwnedByCurrentUser,
  sortSharedItems,
  isUserItemOwner,
  getDraggedItemsWithoutFolders,
};
