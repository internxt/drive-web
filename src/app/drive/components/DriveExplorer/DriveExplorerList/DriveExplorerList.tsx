import React, { memo, useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useAppSelector } from 'app/store/hooks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';

import DriveExplorerListItem from '../DriveExplorerItem/DriveExplorerListItem/DriveExplorerListItem';
import { AppDispatch, RootState } from '../../../../store';
import { storageActions } from '../../../../store/slices/storage';
import { DriveItemData } from '../../../types';
import { OrderDirection, OrderSettings } from '../../../../core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import List from '../../../../shared/components/List';
import storageThunks from '../../../../store/slices/storage/storage.thunks';
import { sharedThunks } from '../../../../store/slices/sharedLinks';
import moveItemsToTrash from '../../../../../use_cases/trash/move-items-to-trash';
import { uiActions } from '../../../../store/slices/ui';
import {
  contextMenuDriveNotSharedLink,
  contextMenuDriveItemShared,
  contextMenuSelectedItems,
  contextMenuTrashItems,
  contextMenuMultipleSelectedTrashItems,
  contextMenuTrashFolder,
  contextMenuDriveFolderShared,
  contextMenuDriveFolderNotSharedLink,
} from './DriveItemContextMenu';
import EditItemNameDialog from '../../EditItemNameDialog/EditItemNameDialog';
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import shareService from '../../../../share/services/share.service';

interface DriveExplorerListProps {
  folderId: number;
  isLoading: boolean;
  items: DriveItemData[];
  selectedItems: DriveItemData[];
  order: OrderSettings;
  disableKeyboardShortcuts: boolean;
  dispatch: AppDispatch;
  onEndOfScroll(): void;
  hasMoreItems: boolean;
  isTrash?: boolean;
  onHoverListItems?: (areHover: boolean) => void;
  title: JSX.Element | string;
}

type ObjectWithId = { id: string | number };

type ContextMenuDriveItem =
  | DriveItemData
  | Pick<DriveItemData, 'type' | 'name' | 'updatedAt' | 'size'>
  | (ListShareLinksItem & { code: string });

function findUniqueItems<T extends ObjectWithId>(array1: T[], array2: T[]): T[] {
  const result: T[] = [];
  const map = new Map<string, T>();

  for (const item of array1) {
    map.set(item.id.toString(), item);
  }

  for (const item of array2) {
    if (!map.has(item.id.toString())) {
      result.push(item);
    } else {
      map.delete(item.id.toString());
    }
  }

  return [...result, ...Array.from(map.values())];
}

const createDriveListItem = (item: DriveItemData, isTrash?: boolean) => (
  <DriveExplorerListItem item={item} isTrash={isTrash} />
);

const DriveExplorerList: React.FC<DriveExplorerListProps> = memo((props) => {
  const [isAllSelectedEnabled, setIsAllSelectedEnabled] = useState(false);
  const [editNameItem, setEditNameItem] = useState<DriveItemData | null>(null);
  const isSelectedMultipleItemsAndNotTrash = props.selectedItems.length > 1 && !props.isTrash;
  const isSelectedSharedItem =
    props.selectedItems.length === 1 &&
    props.selectedItems?.[0].sharings &&
    props.selectedItems?.[0].sharings.length > 0;

  const { translate } = useTranslationContext();

  useEffect(() => {
    setIsAllSelectedEnabled(false);
  }, [props.folderId]);

  useEffect(() => {
    const isAllItemsSelected = props.selectedItems.length === props.items.length;
    const itemsLengthIsNotZero = props.items.length !== 0;

    if (isAllItemsSelected && itemsLengthIsNotZero) {
      setIsAllSelectedEnabled(true);
    } else {
      setIsAllSelectedEnabled(false);
    }
  }, [props.selectedItems]);

  useEffect(() => {
    if (isAllSelectedEnabled) {
      dispatch(storageActions.selectItems(props.items));
    }
  }, [props.items.length]);

  const onSelectedItemsChanged = (changes: { props: DriveItemData; value: boolean }[]) => {
    let updatedSelectedItems = props.selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }

    const deselecteditems = findUniqueItems<DriveItemData>(updatedSelectedItems, props.selectedItems);
    dispatch(storageActions.deselectItems(deselecteditems));
    dispatch(storageActions.selectItems(updatedSelectedItems));
  };

  const { dispatch, isLoading, order, hasMoreItems, onEndOfScroll } = props;

  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const isRecents = props.title === translate('views.recents.head');
  const isTrash = props.title === translate('trash.trash');

  const sortBy = (value: { field: 'type' | 'name' | 'updatedAt' | 'size'; direction: 'ASC' | 'DESC' }) => {
    const direction =
      order.by === value.field
        ? order.direction === OrderDirection.Desc
          ? OrderDirection.Asc
          : OrderDirection.Desc
        : OrderDirection.Asc;
    dispatch(storageActions.setOrder({ by: value.field, direction }));

    if (value.field === 'name') {
      dispatch(storageActions.setDriveItemsSort('plainName'));
      dispatch(storageActions.setDriveItemsOrder(direction));

      dispatch(storageActions.setHasMoreDriveFolders(true));
      dispatch(storageActions.setHasMoreDriveFiles(true));
      dispatch(fetchSortedFolderContentThunk(currentFolderId));
    }

    if (value.field === 'updatedAt') {
      dispatch(storageActions.setDriveItemsSort('updatedAt'));
      dispatch(storageActions.setDriveItemsOrder(direction));

      dispatch(storageActions.setHasMoreDriveFolders(true));
      dispatch(storageActions.setHasMoreDriveFiles(true));
      dispatch(fetchSortedFolderContentThunk(currentFolderId));
    }
  };

  function handleMouseEnter() {
    props.onHoverListItems?.(true);
  }

  function handleMouseLeave() {
    props.onHoverListItems?.(false);
  }

  const renameItem = useCallback(
    (item) => {
      setEditNameItem(item as DriveItemData);
    },
    [setEditNameItem],
  );

  const moveItem = useCallback(
    (item: ContextMenuDriveItem) => {
      dispatch(storageActions.setItemsToMove([item as DriveItemData]));
      dispatch(uiActions.setIsMoveItemsDialogOpen(true));
    },
    [dispatch, storageActions, uiActions],
  );

  const restoreItem = useCallback(
    (item: DriveItemData | Pick<DriveItemData, 'type' | 'name' | 'updatedAt' | 'size'>) => {
      dispatch(storageActions.setItemsToMove([item as DriveItemData]));
      dispatch(uiActions.setIsMoveItemsDialogOpen(true));
    },
    [dispatch, storageActions, uiActions],
  );

  const deletePermanently = useCallback(
    (item: DriveItemData | Pick<DriveItemData, 'type' | 'name' | 'updatedAt' | 'size'>) => {
      dispatch(storageActions.setItemsToDelete([item as DriveItemData]));
      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
    },
    [dispatch, storageActions, uiActions],
  );

  const openPreview = useCallback(
    (item: ContextMenuDriveItem) => {
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item as DriveItemData));
    },
    [dispatch, uiActions],
  );

  const getLink = useCallback(
    (item: ContextMenuDriveItem) => {
      const driveItem = item as DriveItemData;
      shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
    },
    [dispatch, sharedThunks],
  );

  const copyLink = useCallback(
    (item: ContextMenuDriveItem) => {
      const driveItem = item as DriveItemData;
      shareService.getPublicShareLink(driveItem.uuid as string, driveItem.isFolder ? 'folder' : 'file');
    },
    [dispatch, sharedThunks],
  );

  const openLinkSettings = useCallback(
    (item: ContextMenuDriveItem) => {
      dispatch(
        storageActions.setItemToShare({
          share: (item as DriveItemData)?.shares?.[0],
          item: item as DriveItemData,
        }),
      );
      dispatch(uiActions.setIsShareDialogOpen(true));
      // Use to share with specific user
      // dispatch(sharedThunks.shareFileWithUser({ email: 'email_of_user_to_share@example.com' }));
    },
    [dispatch, storageActions, uiActions],
  );

  const downloadItem = useCallback(
    async (item: ContextMenuDriveItem) => {
      dispatch(storageThunks.downloadItemsThunk([item as DriveItemData]));
    },
    [dispatch, storageThunks],
  );

  const moveToTrash = useCallback(
    (item: ContextMenuDriveItem) => {
      moveItemsToTrash([item as DriveItemData]);
    },
    [moveItemsToTrash],
  );

  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-8 w-8 rounded-md bg-gray-5" />
    </div>,
    <div className="h-4 w-64 rounded bg-gray-5" />,
    <div className="ml-3 h-4 w-24 rounded bg-gray-5" />,
    <div className="ml-4 h-4 w-20 rounded bg-gray-5" />,
  ];

  return (
    <div className="flex h-full flex-grow flex-col">
      <div className="h-full w-full overflow-y-auto">
        {editNameItem && (
          <EditItemNameDialog
            item={editNameItem}
            isOpen={true}
            onSuccess={() => {
              dispatch(fetchSortedFolderContentThunk(currentFolderId));
            }}
            onClose={() => {
              setEditNameItem(null);
            }}
          />
        )}
        <List<DriveItemData, 'type' | 'name' | 'updatedAt' | 'size'>
          header={[
            {
              label: translate('drive.list.columns.name'),
              width: 'flex flex-grow items-center min-w-driveNameHeader',
              name: 'name',
              orderable: isRecents || isTrash ? false : true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.modified'),
              width: 'w-date',
              name: 'updatedAt',
              orderable: isRecents || isTrash ? false : true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.size'),
              width: 'w-size',
              name: 'size',
              orderable: false,
            },
          ]}
          disableKeyboardShortcuts={props.disableKeyboardShortcuts}
          items={props.items}
          isLoading={isLoading}
          itemComposition={[(item) => createDriveListItem(item, props.isTrash)]}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          skinSkeleton={skinSkeleton}
          emptyState={<></>}
          onNextPage={onEndOfScroll}
          onEnterPressed={(driveItem) => {
            if (driveItem.isFolder) {
              dispatch(storageThunks.goToFolderThunk({ name: driveItem.name, id: driveItem.id }));
            } else {
              dispatch(uiActions.setIsFileViewerOpen(true));
              dispatch(uiActions.setFileViewerItem(driveItem));
            }
          }}
          hasMoreItems={hasMoreItems}
          menu={
            isSelectedMultipleItemsAndNotTrash
              ? contextMenuSelectedItems({
                  selectedItems: props.selectedItems,
                  moveItems: () => {
                    dispatch(storageActions.setItemsToMove(props.selectedItems));
                    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
                  },
                  downloadItems: () => {
                    dispatch(storageThunks.downloadItemsThunk(props.selectedItems));
                  },
                  moveToTrash: () => {
                    moveItemsToTrash(props.selectedItems);
                  },
                })
              : props.isTrash
              ? props.selectedItems.length > 1
                ? contextMenuMultipleSelectedTrashItems({
                    restoreItem: () => {
                      dispatch(storageActions.setItemsToMove(props.selectedItems));
                      dispatch(uiActions.setIsMoveItemsDialogOpen(true));
                    },
                    deletePermanently: () => {
                      dispatch(storageActions.setItemsToDelete(props.selectedItems));
                      dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
                    },
                  })
                : props.selectedItems[0]?.isFolder
                ? contextMenuTrashFolder({
                    restoreItem: restoreItem,
                    deletePermanently: deletePermanently,
                  })
                : contextMenuTrashItems({
                    openPreview: openPreview,
                    restoreItem: restoreItem,
                    deletePermanently: deletePermanently,
                  })
              : isSelectedSharedItem
              ? props.selectedItems[0]?.isFolder
                ? contextMenuDriveFolderShared({
                    copyLink: copyLink,
                    openShareAccessSettings: (item) => {
                      openLinkSettings(item);
                    },
                    deleteLink: (item) => {
                      dispatch(
                        sharedThunks.deleteLinkThunk({
                          linkId: (item as DriveItemData)?.shares?.[0]?.id as string,
                          item: item as DriveItemData,
                        }),
                      );
                    },
                    renameItem: renameItem,
                    moveItem: moveItem,
                    downloadItem: downloadItem,
                    moveToTrash: moveToTrash,
                  })
                : contextMenuDriveItemShared({
                    openPreview: openPreview,
                    copyLink: copyLink,
                    openShareAccessSettings: (item) => {
                      openLinkSettings(item);
                    },
                    deleteLink: () => ({}),
                    renameItem: renameItem,
                    moveItem: moveItem,
                    downloadItem: downloadItem,
                    moveToTrash: moveToTrash,
                  })
              : props.selectedItems[0]?.isFolder
              ? contextMenuDriveFolderNotSharedLink({
                  shareLink: (item) => {
                    //TODO: ADD OPEN SHARE DIALOG WITH PUBLIC SHARED LINK, MAYBE NOT NEED TO DO SOMETHING
                    // WAITING BACKEND ENDPOINTS
                    // openAdvancedShareLinkSettings(item);
                    openLinkSettings(item);
                  },
                  getLink: getLink,
                  renameItem: renameItem,
                  moveItem: moveItem,
                  downloadItem: downloadItem,
                  moveToTrash: moveToTrash,
                })
              : contextMenuDriveNotSharedLink({
                  shareLink: (item) => {
                    //TODO: ADD OPEN SHARE DIALOG WITH PUBLIC SHARED LINK, MAYBE NOT NEED TO DO SOMETHING
                    // WAITING BACKEND ENDPOINTS
                    // openAdvancedShareLinkSettings(item);
                    openLinkSettings(item);
                  },
                  openPreview: openPreview,
                  getLink: getLink,
                  renameItem: renameItem,
                  moveItem: moveItem,
                  downloadItem: downloadItem,
                  moveToTrash: moveToTrash,
                })
          }
          selectedItems={props.selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          keyBoardShortcutActions={{
            onBackspaceKeyPressed: () => moveItemsToTrash(props.selectedItems),
            onRKeyPressed: () => {
              if (props.selectedItems.length === 1) {
                const selectedItem = props.selectedItems[0];
                renameItem(selectedItem);
              }
            },
          }}
          onOrderByChanged={sortBy}
          orderBy={{
            field: props.order.by as 'type' | 'name' | 'updatedAt' | 'size',
            direction: props.order.direction,
          }}
          onSelectedItemsChanged={onSelectedItemsChanged}
          disableItemCompositionStyles={true}
        />
      </div>
    </div>
  );
});

export default connect((state: RootState) => ({
  selectedItems: state.storage.selectedItems,
  order: state.storage.order,
  disableKeyboardShortcuts:
    state.ui.isShareDialogOpen ||
    state.ui.isSurveyDialogOpen ||
    state.ui.isEditFolderNameDialog ||
    state.ui.isFileViewerOpen ||
    state.ui.isMoveItemsDialogOpen ||
    state.ui.isCreateFolderDialogOpen ||
    state.ui.isNameCollisionDialogOpen ||
    state.ui.isReachedPlanLimitDialogOpen,
}))(DriveExplorerList);
