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
import MoveActionIcon from 'assets/icons/move.svg?react';
import { useSelector } from 'react-redux';
import { moveItemsToTrash } from 'views/Trash/services';
import navigationService from 'services/navigation.service';
import { DriveItemData, DriveItemDetails, FileViewMode } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import shareService from 'app/share/services/share.service';
import { Button, Dropdown } from '@internxt/ui';
import TooltipElement, { DELAY_SHOW_MS } from 'components/TooltipElement';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import { uiActions } from 'app/store/slices/ui';
import { useDriveItemStoreProps } from '../../../hooks';
import {
  contextMenuDriveFolderNotSharedLink,
  contextMenuDriveFolderShared,
  contextMenuDriveItemShared,
  contextMenuDriveNotSharedLink,
  contextMenuWorkspaceFile,
  contextMenuWorkspaceFolder,
} from './DriveItemContextMenu';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { DownloadManager } from 'app/network/DownloadManager';
import { useVersionHistoryMenuConfig } from 'views/Drive/hooks/useVersionHistoryMenuConfig';

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
  currentFolderId: string;
  setEditNameItem: (item: DriveItemData) => void;
  hasAnyItemSelected: boolean;
  isTrash: boolean;
  hasItems: boolean;
  driveActionsRef?: React.MutableRefObject<HTMLDivElement | null>;
}) => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useSelector(workspacesSelectors.getWorkspaceCredentials);
  const isWorkspaceSelected = !!selectedWorkspace;

  const { translate } = useTranslationContext();
  const { dirtyName } = useDriveItemStoreProps();

  const viewMode = useAppSelector((state) => state.storage.viewMode);
  const separatorV = <div className="mx-3 my-2 border-r border-gray-10" />;

  const hasItemsAndIsNotTrash = hasAnyItemSelected && !isTrash;
  const hasItemsAndIsTrash = hasAnyItemSelected && isTrash;

  const versionHistoryMenuConfig = useVersionHistoryMenuConfig(selectedItems[0]);

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
    DownloadManager.downloadItem({
      payload: selectedItems,
      selectedWorkspace,
      workspaceCredentials,
    });
  };

  const onViewVersionHistoryButtonClicked = (): void => {
    dispatch(uiActions.setVersionHistoryItem(selectedItems[0]));
    dispatch(uiActions.setIsVersionHistorySidebarOpen(true));
  };

  const onBulkDeleteButtonClicked = (): void => {
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
        shareService.getPublicShareLink(selectedItem.uuid, selectedItem.isFolder ? 'folder' : 'file');
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
    navigationService.pushFile(selectedItems[0].uuid, selectedWorkspace?.workspaceUser.workspaceId);
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

  const shareWithTeam = (): void => {
    dispatch(uiActions.setIsShareWhithTeamDialogOpen(true));
  };

  const workspaceItemMenu = contextMenuWorkspaceFile({
    shareLink: onOpenShareSettingsButtonClicked,
    shareWithTeam,
    openPreview: onOpenPreviewButtonClicked,
    showDetails: onShowDetailsButtonClicked,
    getLink: onSelectedOneItemShare,
    renameItem: onSelectedOneItemRename,
    moveItem: onMoveItemButtonClicked,
    downloadItem: onDownloadButtonClicked,
    viewVersionHistory: onViewVersionHistoryButtonClicked,
    moveToTrash: onBulkDeleteButtonClicked,
    versionHistoryConfig: versionHistoryMenuConfig,
  });

  const workspaceFolderMenu = contextMenuWorkspaceFolder({
    shareLink: onOpenShareSettingsButtonClicked,
    shareWithTeam,
    showDetails: onShowDetailsButtonClicked,
    getLink: onSelectedOneItemShare,
    renameItem: onSelectedOneItemRename,
    moveItem: onMoveItemButtonClicked,
    downloadItem: onDownloadButtonClicked,
    viewVersionHistory: onViewVersionHistoryButtonClicked,
    moveToTrash: onBulkDeleteButtonClicked,
    versionHistoryConfig: versionHistoryMenuConfig,
  });

  const dropdownActions = () => {
    if (isWorkspaceSelected) {
      if (selectedItems[0].isFolder) {
        return workspaceFolderMenu;
      } else {
        return workspaceItemMenu;
      }
    }

    if (selectedItems[0].sharings && selectedItems[0].sharings?.length > 0) {
      return selectedItems[0].isFolder
        ? contextMenuDriveFolderShared({
            showDetails: onShowDetailsButtonClicked,
            copyLink: onSelectedOneItemShare,
            openShareAccessSettings: onOpenShareSettingsButtonClicked,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            viewVersionHistory: onViewVersionHistoryButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
            versionHistoryConfig: versionHistoryMenuConfig,
          })
        : contextMenuDriveItemShared({
            openPreview: onOpenPreviewButtonClicked,
            showDetails: onShowDetailsButtonClicked,
            copyLink: onSelectedOneItemShare,
            openShareAccessSettings: onOpenShareSettingsButtonClicked,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            viewVersionHistory: onViewVersionHistoryButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
            versionHistoryConfig: versionHistoryMenuConfig,
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
            viewVersionHistory: onViewVersionHistoryButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
            versionHistoryConfig: versionHistoryMenuConfig,
          })
        : contextMenuDriveNotSharedLink({
            shareLink: onOpenShareSettingsButtonClicked,
            openPreview: onOpenPreviewButtonClicked,
            showDetails: onShowDetailsButtonClicked,
            getLink: onSelectedOneItemShare,
            renameItem: onSelectedOneItemRename,
            moveItem: onMoveItemButtonClicked,
            downloadItem: onDownloadButtonClicked,
            viewVersionHistory: onViewVersionHistoryButtonClicked,
            moveToTrash: onBulkDeleteButtonClicked,
            versionHistoryConfig: versionHistoryMenuConfig,
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
                    variant="ghost"
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
                  <Button variant="ghost" className="aspect-square" onClick={onSelectedOneItemShare}>
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
                <Button variant="ghost" className="aspect-square" onClick={onMoveItemButtonClicked}>
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
              <Button variant="ghost" className="aspect-square" onClick={onDownloadButtonClicked}>
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
              <Button variant="ghost" className="aspect-square" onClick={onBulkDeleteButtonClicked}>
                <Trash className="h-6 w-6" />
              </Button>
              <TooltipElement id="trash-tooltip" delayShow={DELAY_SHOW_MS} />
            </div>
            {selectedItems.length === 1 && (
              <Dropdown
                classButton="flex items-center justify-center"
                openDirection="right"
                classMenuItems="z-20 right-0 mt-0 flex flex-col rounded-lg bg-surface dark:bg-gray-5 border border-gray-10 shadow-subtle-hard min-w-[180px]"
                item={selectedItems[0]}
                dropdownActionsContext={dropdownActions()}
              >
                <div
                  className="flex items-center justify-center"
                  data-tooltip-id="more-tooltip"
                  data-tooltip-content={translate('actions.more')}
                  data-tooltip-place="bottom"
                >
                  <Button variant="ghost" className="aspect-square">
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
            <Button variant="ghost" className="aspect-square" onClick={onViewModeButtonClicked}>
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
          <Button variant="ghost" className="aspect-square" onClick={onRecoverButtonClicked}>
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
            variant="ghost"
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
