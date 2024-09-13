import { IRoot } from 'app/store/slices/storage/storage.thunks/uploadFolderThunk';
import { DriveItemData } from '../drive/types';
import { AdvancedSharedItem } from '../share/types';

type ItemData = AdvancedSharedItem | DriveItemData;
type HiddenItemsData = IRoot | File;

/**
 * Removes duplicate elements from a list based on a unique key.
 *
 * @template T - Type of elements in the list, which must extend AdvancedSharedItem or DriveItemData.
 * @param {T[]} list - List of elements that can be of type AdvancedSharedItem or DriveItemData.
 * @returns {T[]} - Filtered list without duplicate elements.
 */
const removeDuplicates = <T extends ItemData>(list: T[]) => {
  const hash: Record<string, boolean> = {};
  return list.filter((obj) => {
    const key = obj.uuid ?? `${obj.id}-${obj.name}-${obj.updatedAt}-${obj.type}`;

    if (hash[key]) {
      return false;
    }
    hash[key] = true;
    return true;
  });
};

/**
 * Remove hidden items in a folder or does not allow upload them (items starting with a .)
 *
 * @template T - Type of elements in the list, which must extend IRoot and File.
 * @param {T[]} items The items array to check if there are hidden files
 * @returns {T[]} - Filtered list without hidden items
 */

const removeHiddenItemsBeforeUpload = <T extends HiddenItemsData>(items: T[]) => {
  const itemsFiltered = items.filter((file) => !file.name.startsWith('.'));
  return itemsFiltered;
};

export { removeDuplicates, removeHiddenItemsBeforeUpload as removeHiddenItems };
