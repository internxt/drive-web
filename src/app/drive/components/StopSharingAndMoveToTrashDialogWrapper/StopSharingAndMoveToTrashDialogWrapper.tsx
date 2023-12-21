import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { MAX_SHARED_NAME_LENGTH } from '../../../share/views/SharedLinksView/SharedView';
import StopSharingAndMoveToTrashDialog from './components/StopSharingAndMoveToTrashDialog';
import { sharedThunks } from '../../../store/slices/sharedLinks';
import { useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';

interface StopSharingAndMoveToTrashDialogWrapperProps {
  selectedItems: any[];
  showStopSharingConfirmation: boolean;
  onClose: () => void;
  isItemOwnedByCurrentUser?: (userUuid: string) => boolean;
  moveItemsToTrash: (items: any[]) => Promise<void>;
  isMultipleItems: boolean;
  itemToShareName: string;
}

const StopSharingAndMoveToTrashDialogWrapper = (props: StopSharingAndMoveToTrashDialogWrapperProps) => {
  const {
    selectedItems,
    showStopSharingConfirmation,
    isMultipleItems,
    itemToShareName,
    onClose,
    isItemOwnedByCurrentUser,
    moveItemsToTrash,
  } = props;
  const dispatch = useDispatch();
  const [isStopSharingDialogLoading, setIsStopSharingDialogLoading] = useState(false);

  const onStopSharingAndMoveToTrash = async () => {
    setIsStopSharingDialogLoading(true);

    const stopSharingItems = selectedItems.map(async (item) => {
      let itemName: string;

      if (isItemOwnedByCurrentUser && !isItemOwnedByCurrentUser(item.user?.uuid)) return;

      if (item.name.length > MAX_SHARED_NAME_LENGTH) {
        itemName = item.name.substring(0, 32).concat('...');
      } else {
        itemName = item.name;
      }

      await dispatch(
        sharedThunks.stopSharingItem({
          itemType: item?.isFolder ? 'folder' : 'file',
          itemId: item.uuid,
          itemName,
        }),
      );

      return item;
    });

    const resolvedItems = (await Promise.all(stopSharingItems)).filter(Boolean);

    await moveItemsToTrash(resolvedItems);

    onClose();
    setIsStopSharingDialogLoading(false);
  };

  return (
    <StopSharingAndMoveToTrashDialog
      onStopSharing={onStopSharingAndMoveToTrash}
      isLoading={isStopSharingDialogLoading}
      itemToShareName={itemToShareName}
      onClose={onClose}
      showStopSharingConfirmation={showStopSharingConfirmation}
      isMultipleItems={isMultipleItems}
    />
  );
};

export default StopSharingAndMoveToTrashDialogWrapper;
