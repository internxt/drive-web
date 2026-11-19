import { useCallback, useState } from 'react';
import { DriveItemData } from 'app/drive/types';
import { moveItemsToTrash } from 'views/Trash/services';

export const useStopSharingAndTrash = (onItemsMovedToTrash: () => void) => {
  const [isStopSharingConfirmationOpen, setIsStopSharingConfirmationOpen] = useState(false);

  const openStopSharingConfirmation = useCallback(() => setIsStopSharingConfirmationOpen(true), []);
  const closeStopSharingConfirmation = useCallback(() => setIsStopSharingConfirmationOpen(false), []);

  const moveItemsToTrashOnStopSharing = async (items: DriveItemData[]) => {
    await moveItemsToTrash(items);
    onItemsMovedToTrash();
  };

  return {
    isStopSharingConfirmationOpen,
    openStopSharingConfirmation,
    closeStopSharingConfirmation,
    moveItemsToTrashOnStopSharing,
  };
};
