import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';

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

type ItemWithLinkExpiration = {
  linkExpirationDate?: string;
  sharings?: { type: string; expirationAt?: string | null }[];
};

/**
 * Gets the expiration date of the public link of an item.
 * Shared lists return it as `linkExpirationDate`, while drive lists return it inside the public sharing.
 *
 * @param {ItemWithLinkExpiration} item - Item that may have a public link.
 * @returns {string | undefined} - Expiration date of the public link, or undefined if it never expires.
 */
const getLinkExpirationDate = (item: ItemWithLinkExpiration): string | undefined => {
  if (item.linkExpirationDate) {
    return item.linkExpirationDate;
  }

  return item.sharings?.find((sharing) => sharing.type === 'public')?.expirationAt ?? undefined;
};

export { removeDuplicates, getLinkExpirationDate };
