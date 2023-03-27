import React, { memo, useCallback, useEffect, useState } from 'react';
import UilArrowDown from '@iconscout/react-unicons/icons/uil-arrow-down';
import UilArrowUp from '@iconscout/react-unicons/icons/uil-arrow-up';
import { connect } from 'react-redux';

import DriveExplorerListItem from '../DriveExplorerItem/DriveExplorerListItem/DriveExplorerListItem';
import { AppDispatch, RootState } from '../../../../store';
import { storageActions } from '../../../../store/slices/storage';
import { DriveItemData } from '../../../types';
import { OrderDirection, OrderSettings } from '../../../../core/types';
import DriveListItemSkeleton from '../../DriveListItemSkeleton/DriveListItemSkeleton';
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
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';

interface DriveExplorerListProps {
  folderId: number;
  isLoading: boolean;
  items: DriveItemData[];
  selectedItems: DriveItemData[];
  order: OrderSettings;
  dispatch: AppDispatch;
  onEndOfScroll(): void;
  hasMoreItems: boolean;
  isTrash?: boolean;
  onHoverListItems?: (areHover: boolean) => void;
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
  const isSelectedMultipleItemsAndNotTrash = props.selectedItems.length > 1 && !props.isTrash;
  const isSelectedSharedItem = props.selectedItems.length === 1 && (props.selectedItems?.[0].shares?.length || 0) > 0;

  const { translate } = useTranslationContext();

  useEffect(() => {
    setIsAllSelectedEnabled(false);
  }, [props.folderId]);

  useEffect(() => {
    if (props.selectedItems.length === props.items.length) {
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

  const hasItems = props.items.length > 0;

  const itemsList = (): JSX.Element[] => {
    return props.items.map((item: DriveItemData) => {
      const itemParentId = item.parentId || item.folderId;
      const itemKey = `${item.isFolder ? 'folder' : 'file'}-${item.id}-${itemParentId}`;

      return <DriveExplorerListItem isTrash={props.isTrash} key={itemKey} item={item} />;
    });
  };

  const itemsFileList = (): JSX.Element[] => {
    return props.items
      .filter((item) => !item.isFolder)
      .map((item: DriveItemData) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'file'-${item.id}-${itemParentId}`;

        return <DriveExplorerListItem key={itemKey} item={item} isTrash={props.isTrash} />;
      });
  };

  const itemsFolderList = (): JSX.Element[] => {
    return props.items
      .filter((item) => item.isFolder)
      .map((item: DriveItemData) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'folder'-${item.id}-${itemParentId}`;

        return <DriveExplorerListItem key={itemKey} item={item} isTrash={props.isTrash} />;
      });
  };

  const isAllSelected = () => {
    const isAllItemsSelected = props.selectedItems.length === props.items.length && props.items.length > 0;
    return isAllItemsSelected;
  };

  const loadingSkeleton = (): JSX.Element[] =>
    Array(60)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);

  const onSelectAllButtonClicked = () => {
    const { dispatch, items } = props;
    setIsAllSelectedEnabled(!isAllSelectedEnabled);
    isAllSelected() ? dispatch(storageActions.clearSelectedItems()) : dispatch(storageActions.selectItems(items));
  };

  const onSelectedItemsChanged = (changes: { props: DriveItemData; value: boolean }[]) => {
    let updatedSelectedItems = props.selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }
    //  const deselecteditems = props.selectedItems.filter((selectedItem) => updatedSelectedItems.map().includes())
    const deselecteditems = findUniqueItems<DriveItemData>(updatedSelectedItems, props.selectedItems);
    dispatch(storageActions.deselectItems(deselecteditems));
    dispatch(storageActions.selectItems(updatedSelectedItems));
  };

  const { dispatch, isLoading, order, hasMoreItems, onEndOfScroll } = props;

  const sortBy = (value: { field: 'type' | 'name' | 'updatedAt' | 'size'; direction: 'ASC' | 'DESC' }) => {
    const direction =
      order.by === value.field
        ? order.direction === OrderDirection.Desc
          ? OrderDirection.Asc
          : OrderDirection.Desc
        : OrderDirection.Asc;
    dispatch(storageActions.setOrder({ by: value.field, direction }));
  };

  const sortButtonFactory = () => {
    const IconComponent = order.direction === OrderDirection.Desc ? UilArrowDown : UilArrowUp;
    return <IconComponent className="ml-2" />;
  };

  function handleMouseEnter() {
    props.onHoverListItems?.(true);
  }

  function handleMouseLeave() {
    props.onHoverListItems?.(false);
  }

  const renameItem = useCallback(
    (item: ContextMenuDriveItem) => {
      dispatch(uiActions.setCurrentEditingNameDirty((item as DriveItemData).name));
      dispatch(uiActions.setCurrentEditingNameDriveItem(item as DriveItemData));
    },
    [dispatch, uiActions],
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
      dispatch(sharedThunks.getSharedLinkThunk({ item: item as DriveItemData }));
    },
    [dispatch, sharedThunks],
  );

  const copyLink = useCallback(
    (item: ContextMenuDriveItem) => {
      dispatch(sharedThunks.getSharedLinkThunk({ item: item as DriveItemData }));
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
      dispatch(uiActions.setIsShareItemDialogOpen(true));
    },
    [dispatch, storageActions, uiActions],
  );

  const deleteLink = useCallback(
    (item: ContextMenuDriveItem) => {
      dispatch(
        sharedThunks.deleteLinkThunk({
          linkId: (item as DriveItemData)?.shares?.[0]?.id as string,
          item: item as DriveItemData,
        }),
      );
    },
    [dispatch, sharedThunks],
  );

  const downloadItem = useCallback(
    (item: ContextMenuDriveItem) => {
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

  return (
    <div className="flex h-full flex-grow flex-col">
      <div className="h-full overflow-y-auto">
        {isLoading ? (
          loadingSkeleton()
        ) : (
          <List<DriveItemData, 'type' | 'name' | 'updatedAt' | 'size'>
            header={[
              {
                label: translate('drive.list.columns.type'),
                width: 'flex w-1/12 cursor-pointer items-center px-3',
                name: 'type',
                orderable: true,
                defaultDirection: 'ASC',
              },
              {
                label: translate('drive.list.columns.name'),
                width: 'flex flex-grow cursor-pointer items-center pl-6',
                name: 'name',
                orderable: true,
                defaultDirection: 'ASC',
              },
              {
                label: translate('drive.list.columns.modified'),
                width: 'hidden w-3/12 lg:flex pl-4',
                name: 'updatedAt',
                orderable: true,
                defaultDirection: 'ASC',
              },
              {
                label: translate('drive.list.columns.size'),
                width: 'flex w-1/12 cursor-pointer items-center',
                name: 'size',
                orderable: true,
                defaultDirection: 'ASC',
              },
            ]}
            items={props.items}
            isLoading={isLoading}
            itemComposition={[(item) => createDriveListItem(item, props.isTrash)]}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            skinSkeleton={loadingSkeleton()}
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
                      openLinkSettings: openLinkSettings,
                      deleteLink: deleteLink,
                      renameItem: renameItem,
                      moveItem: moveItem,
                      downloadItem: downloadItem,
                      moveToTrash: moveToTrash,
                    })
                  : contextMenuDriveItemShared({
                      openPreview: openPreview,
                      copyLink: copyLink,
                      openLinkSettings: openLinkSettings,
                      deleteLink: deleteLink,
                      renameItem: renameItem,
                      moveItem: moveItem,
                      downloadItem: downloadItem,
                      moveToTrash: moveToTrash,
                    })
                : props.selectedItems[0]?.isFolder
                ? contextMenuDriveFolderNotSharedLink({
                    getLink: getLink,
                    renameItem: renameItem,
                    moveItem: moveItem,
                    downloadItem: downloadItem,
                    moveToTrash: moveToTrash,
                  })
                : contextMenuDriveNotSharedLink({
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
                  dispatch(uiActions.setCurrentEditingNameDirty(selectedItem.name));
                  dispatch(uiActions.setCurrentEditingNameDriveItem(selectedItem));
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
        )}
      </div>
    </div>
  );
});

export default connect((state: RootState) => ({
  selectedItems: state.storage.selectedItems,
  order: state.storage.order,
}))(DriveExplorerList);
