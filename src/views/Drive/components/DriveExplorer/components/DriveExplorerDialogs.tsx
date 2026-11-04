import { useCallback } from 'react';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';
import navigationService from 'services/navigation.service';
import EditItemNameDialog from 'app/drive/components/EditItemNameDialog/EditItemNameDialog';
import ItemDetailsDialog from 'app/drive/components/ItemDetailsDialog/ItemDetailsDialog';
import MoveItemsDialog from 'app/drive/components/MoveItemsDialog/MoveItemsDialog';
import NameCollisionContainer from 'app/drive/components/NameCollisionDialog/NameCollisionContainer';
import { ShareDialogWrapper } from 'app/drive/components/ShareDialog/ShareDialogWrapper';
import UploadItemsFailsDialog from 'app/drive/components/UploadItemsFailsDialog/UploadItemsFailsDialog';
import { CreateFolderDialog } from 'views/Drive/components';
import { ClearTrashDialog } from 'views/Trash/components';
import DeleteItemsDialog from 'views/Trash/components/DeleteItemsDialog';
import StopSharingAndMoveToTrashDialogWrapper from 'views/Trash/components/StopSharingAndMoveToTrashDialogWrapper';

interface DriveExplorerDialogsProps {
  isTrash: boolean;
  items: DriveItemData[];
  editNameItem: DriveItemData | null;
  isStopSharingConfirmationOpen: boolean;
  onFolderCreated?: () => void;
  onTrashCleared: () => void;
  refreshItems: () => void;
  refreshItemsAfterChange: () => void;
  onEditNameClose: (renamedItem?: DriveItemData) => void;
  onStopSharingConfirmationClose: () => void;
  moveItemsToTrashOnStopSharing: (items: DriveItemData[]) => Promise<void>;
}

const DriveExplorerDialogs = (props: DriveExplorerDialogsProps) => {
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const selectedItems = useAppSelector((state: RootState) => state.storage.selectedItems);
  const workspaceId = useAppSelector(workspacesSelectors.getSelectedWorkspace)?.workspaceUser.workspaceId;

  const onDetailsButtonClicked = useCallback(
    (item: DriveItemData | AdvancedSharedItem) => {
      if (item.isFolder) {
        navigationService.pushFolder(item.uuid, workspaceId);
      } else {
        navigationService.pushFile(item.uuid, workspaceId);
      }
    },
    [workspaceId],
  );

  return (
    <>
      <DeleteItemsDialog />
      <CreateFolderDialog onFolderCreated={props.onFolderCreated} currentFolderId={currentFolderId} />
      <ShareDialogWrapper isDriveItem onShareItem={props.refreshItemsAfterChange} />
      <NameCollisionContainer />
      <MoveItemsDialog items={[...props.items]} onItemsMoved={props.refreshItems} isTrash={props.isTrash} />
      <ClearTrashDialog onItemsDeleted={props.onTrashCleared} />
      <UploadItemsFailsDialog />
      <ItemDetailsDialog onDetailsButtonClicked={onDetailsButtonClicked} isTrash={props.isTrash} />
      {props.editNameItem && (
        <EditItemNameDialog
          item={props.editNameItem}
          isOpen={true}
          onSuccess={props.refreshItemsAfterChange}
          onClose={props.onEditNameClose}
        />
      )}
      {!props.isTrash && props.isStopSharingConfirmationOpen && (
        <StopSharingAndMoveToTrashDialogWrapper
          selectedItems={selectedItems}
          showStopSharingConfirmation={props.isStopSharingConfirmationOpen}
          onClose={props.onStopSharingConfirmationClose}
          moveItemsToTrash={props.moveItemsToTrashOnStopSharing}
        />
      )}
    </>
  );
};

export default DriveExplorerDialogs;
