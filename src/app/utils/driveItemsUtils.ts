import { DriveItemData } from '../drive/types';
import { AdvancedSharedItem } from '../share/types';

type ItemData = AdvancedSharedItem | DriveItemData;

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

export { removeDuplicates };
