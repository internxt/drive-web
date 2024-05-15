import {
  ClockCounterClockwise,
  DotsThreeVertical,
  DownloadSimple,
  Link,
  Rows,
  SquaresFour,
  Trash,
  Users,
} from '@phosphor-icons/react';
import { ReactComponent as MoveActionIcon } from 'assets/icons/move.svg';
import moveItemsToTrash from 'use_cases/trash/move-items-to-trash';
import errorService from '../../../../core/services/error.service';
import navigationService from '../../../../core/services/navigation.service';
import { DriveItemData, DriveItemDetails, FileViewMode } from '../../../../drive/types';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import Button from '../../../../shared/components/Button/Button';
import Dropdown from '../../../../shared/components/Dropdown';
import TooltipElement, { DELAY_SHOW_MS } from '../../../../shared/components/Tooltip/Tooltip';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { sharedThunks } from '../../../../store/slices/sharedLinks';
import { storageActions } from '../../../../store/slices/storage';
import storageThunks from '../../../../store/slices/storage/storage.thunks';
import { uiActions } from '../../../../store/slices/ui';
import useDriveItemStoreProps from '../DriveExplorerItem/hooks/useDriveStoreProps';
import {
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveFolderShared,
  contextMenuDriveItemShared,
  contextMenuDriveNotSharedLink,
} from '../DriveExplorerList/DriveItemContextMenu';

const DriveTopBarActions = ({
  selectedItems,
  currentFolderId,
  setEditNameItem,
  hasAnyItemSelected,
  isTrash,
  hasItems,
  driveActionsRef,
}: {
  selectedItems: DriveItemData[];
  currentFolderId: number;
  setEditNameItem: (item: DriveItemData) => void;
  hasAnyItemSelected: boolean;
  isTrash: boolean;
  hasItems: boolean;
  driveActionsRef?: React.MutableRefObject<HTMLDivElement | null>;
}) => {
  const dispatch = useAppDispatch();

  const { translate } = useTranslationContext();
  const { dirtyName } = useDriveItemStoreProps();

  const viewMode = useAppSelector((state) => state.storage.viewMode);
  const separatorV = <div className="mx-3 my-2 border-r border-gray-10" />;

  const hasItemsAndIsNotTrash = hasAnyItemSelected && !isTrash;
  const hasItemsAndIsTrash = hasAnyItemSelected && isTrash;

  const viewModesIcons = {
    [FileViewMode.List]: (
      <SquaresFour
        size={24}
        className="outline-none"
        data-tooltip-id="viewMode-tooltip"
        data-tooltip-content={translate('drive.viewMode.gridMode')}
        data-tooltip-place="bottom"
      />
    ),
    [FileViewMode.Grid]: (
      <Rows
        size={24}
        className="outline-none"
        data-tooltip-id="viewMode-tooltip"
        data-tooltip-content={translate('drive.viewMode.listMode')}
        data-tooltip-place="bottom"
      />
    ),
  };

  const onViewModeButtonClicked = (): void => {
    const setViewMode: FileViewMode = viewMode === FileViewMode.List ? FileViewMode.Grid : FileViewMode.List;

    dispatch(storageActions.setViewMode(setViewMode));
  };

  const onDownloadButtonClicked = (): void => {
    dispatch(storageThunks.downloadItemsThunk(selectedItems));
  };

  const onBulkDeleteButtonClicked = (): void => {
    errorService.addBreadcrumb({
      level: 'info',
      category: 'button',
      message: 'Top bar delete items button clicked',
      data: {
        currentFolderId: currentFolderId,
      },
    });
    moveItemsToTrash(selectedItems);
  };

  const onSelectedOneItemShare = (e): void => {
    if (selectedItems.length === 1) {
      const selectedItem = selectedItems[0];
      dispatch(
        storageActions.setItemToShare({
          sharing: selectedItems[0]?.sharings && selectedItems[0]?.sharings?.[0],
          item: selectedItem,
        }),
      );
      if (selectedItem?.uuid)
        dispatch(
          sharedThunks.getPublicShareLink({
            itemUUid: selectedItem.uuid,
            itemType: selectedItem.isFolder ? 'folder' : 'file',
          }),
        );
    }
  };

  const onSelectedOneItemRename = (e): void => {
    if (selectedItems.length === 1) {
      if (!dirtyName || dirtyName === null || dirtyName.trim() === '') {
        setEditNameItem(selectedItems[0]);
      }
    }
  };

  const onShowDetailsButtonClicked = (): void => {
    const itemDetails: DriveItemDetails = {
      ...selectedItems[0],
      isShared: !!selectedItems[0].sharings?.length,
      view: 'Drive',
    };
    dispatch(uiActions.setItemDetailsItem(itemDetails));
    dispatch(uiActions.setIsItemDetailsDialogOpen(true));
  };

  const onOpenShareSettingsButtonClicked = (): void => {
    dispatch(storageActions.setItemToShare({ item: selectedItems[0] }));
    dispatch(uiActions.setIsShareDialogOpen(true));
  };

  const onMoveItemButtonClicked = (): void => {
    const itemsToMove = selectedItems.length === 1 ? [selectedItems[0]] : selectedItems;
    dispatch(storageActions.setItemsToMove(itemsToMove));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onOpenPreviewButtonClicked = (): void => {
    navigationService.pushFile(selectedItems[0].uuid);
  };

  const onRecoverButtonClicked = (): void => {
    dispatch(storageActions.setItemsToMove(selectedItems));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onDeletePermanentlyButtonClicked = (): void => {
    if (selectedItems.length > 0) {
      dispatch(storageActions.setItemsToDelete(selectedItems));
      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    } else {
      dispatch(uiActions.setIsClearTrashDialogOpen(true));
    }
  };

  const dropdownActions = () => {
    if (selectedItems[0].sharings && selectedItems[0].sharings?.length > 0) {
      return selectedItems[0].isFolder
        ? contextMenuDriveFolderShared({
            showDetails: onShowDetailsButtonClicked,
            copyLink: onSelectedOneItemShare,
            openShareAccessSettings: onOpenShareSettingsButtonClicked,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
          })
        : contextMenuDriveItemShared({
            openPreview: onOpenPreviewButtonClicked,
            showDetails: onShowDetailsButtonClicked,
            copyLink: onSelectedOneItemShare,
            openShareAccessSettings: onOpenShareSettingsButtonClicked,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
          });
    } else {
      return selectedItems[0].isFolder
        ? contextMenuDriveFolderNotSharedLink({
            shareLink: onOpenShareSettingsButtonClicked,
            showDetails: onShowDetailsButtonClicked,
            getLink: onSelectedOneItemShare,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
          })
        : contextMenuDriveNotSharedLink({
            shareLink: onOpenShareSettingsButtonClicked,
            openPreview: onOpenPreviewButtonClicked,
            showDetails: onShowDetailsButtonClicked,
            getLink: onSelectedOneItemShare,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
          });
    }
  };

  return (
    <div className="flex shrink-0 flex-row">
      {hasItemsAndIsNotTrash && (
        <>
          {separatorV}
          <div ref={driveActionsRef} className="flex items-center justify-center">
            {selectedItems.length === 1 && (
              <>
                <div
                  className="flex items-center justify-center"
                  data-tooltip-id="share-tooltip"
                  data-tooltip-content={translate('drive.dropdown.share')}
                  data-tooltip-place="bottom"
                >
                  <Button
                    variant="tertiary"
                    className="aspect-square"
                    onClick={() => {
                      dispatch(storageActions.setItemToShare({ item: selectedItems[0] }));
                      dispatch(uiActions.setIsShareDialogOpen(true));
                    }}
                  >
                    <Users className="h-6 w-6" />
                  </Button>
                  <TooltipElement id="share-tooltip" delayShow={DELAY_SHOW_MS} />
                </div>

                <div
                  className="flex items-center justify-center"
                  data-tooltip-id="copyLink-tooltip"
                  data-tooltip-content={translate('drive.dropdown.copyLink')}
                  data-tooltip-place="bottom"
                >
                  <Button variant="tertiary" className="aspect-square" onClick={onSelectedOneItemShare}>
                    <Link className="h-6 w-6" />
                  </Button>
                  <TooltipElement id="copyLink-tooltip" delayShow={DELAY_SHOW_MS} />
                </div>
              </>
            )}
            {selectedItems.length > 1 && (
              <div
                className="flex items-center justify-center"
                data-tooltip-id="move-tooltip"
                data-tooltip-content={translate('drive.dropdown.move')}
                data-tooltip-place="bottom"
              >
                <Button variant="tertiary" className="aspect-square" onClick={onMoveItemButtonClicked}>
                  <MoveActionIcon className="h-6 w-6" />
                </Button>
                <TooltipElement id="move-tooltip" delayShow={DELAY_SHOW_MS} />
              </div>
            )}
            <div
              className="flex items-center justify-center"
              data-tooltip-id="download-tooltip"
              data-tooltip-content={translate('drive.dropdown.download')}
              data-tooltip-place="bottom"
            >
              <Button variant="tertiary" className="aspect-square" onClick={onDownloadButtonClicked}>
                <DownloadSimple className="h-6 w-6" />
              </Button>
              <TooltipElement id="download-tooltip" delayShow={DELAY_SHOW_MS} />
            </div>
            <div
              className="flex items-center justify-center"
              data-tooltip-id="trash-tooltip"
              data-tooltip-content={translate('drive.dropdown.moveToTrash')}
              data-tooltip-place="bottom"
            >
              <Button variant="tertiary" className="aspect-square" onClick={onBulkDeleteButtonClicked}>
                <Trash className="h-6 w-6" />
              </Button>
              <TooltipElement id="trash-tooltip" delayShow={DELAY_SHOW_MS} />
            </div>
            {selectedItems.length === 1 && (
              <Dropdown
                classButton="flex items-center justify-center"
                openDirection="right"
                classMenuItems="z-20 right-0 mt-0 flex flex-col rounded-lg bg-surface dark:bg-gray-5 border border-gray-10 py-1.5 shadow-subtle-hard min-w-[180px]"
                item={selectedItems[0]}
                dropdownActionsContext={dropdownActions()}
              >
                <div
                  className="flex items-center justify-center"
                  data-tooltip-id="more-tooltip"
                  data-tooltip-content={translate('actions.more')}
                  data-tooltip-place="bottom"
                >
                  <Button variant="tertiary" className="aspect-square">
                    <DotsThreeVertical size={24} />
                  </Button>
                  <TooltipElement id="more-tooltip" delayShow={DELAY_SHOW_MS} />
                </div>
              </Dropdown>
            )}
          </div>
        </>
      )}
      {!isTrash && (
        <>
          {separatorV}
          <div className="flex items-center justify-center">
            <Button variant="tertiary" className="aspect-square" onClick={onViewModeButtonClicked}>
              {viewModesIcons[viewMode]}
            </Button>
            <TooltipElement id="viewMode-tooltip" delayShow={DELAY_SHOW_MS} />
          </div>
        </>
      )}
      {hasItemsAndIsTrash && (
        <div
          className="flex items-center justify-center"
          data-tooltip-id="restore-tooltip"
          data-tooltip-content={translate('trash.item-menu.restore')}
          data-tooltip-place="bottom"
        >
          <Button variant="tertiary" className="aspect-square" onClick={onRecoverButtonClicked}>
            <ClockCounterClockwise className="h-6 w-6" />
          </Button>
          <TooltipElement id="restore-tooltip" delayShow={DELAY_SHOW_MS} />
        </div>
      )}
      {isTrash && (
        <div
          className="flex items-center justify-center"
          data-tooltip-id="delete-permanently-tooltip"
          data-tooltip-content={translate('trash.item-menu.delete-permanently')}
          data-tooltip-place="bottom"
        >
          <Button
            variant="tertiary"
            className="aspect-square"
            disabled={!hasItems}
            onClick={onDeletePermanentlyButtonClicked}
          >
            <Trash className="h-5 w-5" />
          </Button>
          <TooltipElement id="delete-permanently-tooltip" delayShow={DELAY_SHOW_MS} />
        </div>
      )}
    </div>
  );
};

export default DriveTopBarActions;
