import React, { memo, useEffect, useState, RefObject } from 'react';
import UilArrowDown from '@iconscout/react-unicons/icons/uil-arrow-down';
import UilArrowUp from '@iconscout/react-unicons/icons/uil-arrow-up';
import { connect } from 'react-redux';

import DriveExplorerListItem from '../DriveExplorerItem/DriveExplorerListItem/DriveExplorerListItem';
import { AppDispatch, RootState } from '../../../../store';
import storage, { storageActions } from '../../../../store/slices/storage';
import { DriveFileData, DriveItemData } from '../../../types';
import { OrderDirection, OrderSettings } from '../../../../core/types';
import DriveListItemSkeleton from '../../DriveListItemSkeleton/DriveListItemSkeleton';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import List from '../../../../shared/components/List';
import iconService from '../../../services/icon.service';
import { Copy, Download, Gear, Link, LinkBreak, Pencil, Trash } from 'phosphor-react';
import dateService from '../../../../core/services/date.service';
import sizeService from '../../../services/size.service';
import useDriveItemActions from '../DriveExplorerItem/hooks/useDriveItemActions';
import storageThunks from '../../../../store/slices/storage/storage.thunks';
import { sharedThunks } from '../../../../store/slices/sharedLinks';
import moveItemsToTrash from '../../../../../use_cases/trash/move-items-to-trash';
import { TFunction } from 'i18next';
import { uiActions } from '../../../../store/slices/ui';
import {
  contextMenuDriveNotSharedLink,
  contextMenuDriveItemShared,
  contextMenuSelectedItems,
  contextMenuTrashItems,
  contextMenuMultipleSelectedTrashItems,
} from './DriveItemContextMenu';

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

//TODO: move this function to utils or other
const compareArrays = (array1, array2) => {
  const result: any[] = [];
  const map = new Map();

  for (const item of array1) {
    map.set(item.id, item);
  }

  for (const item of array2) {
    if (!map.has(item.id)) {
      result.push(item);
    } else {
      map.delete(item.id);
    }
  }

  return [...result, ...Array.from(map.values())];
};

const DriveExplorerList: React.FC<DriveExplorerListProps> = memo((props) => {
  const [isAllSelectedEnabled, setIsAllSelectedEnabled] = useState(false);

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
    const deselecteditems = compareArrays(updatedSelectedItems, props.selectedItems);
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

  return (
    //TODO: REMEMBER TO REMOVE ALL COMMENTED CODE! -----------------------------------------
    <div className="flex h-full flex-grow flex-col">
      {/* <div className="files-list flex border-b border-neutral-30 bg-white py-3 text-sm font-semibold text-neutral-500">
        <div className="box-content flex w-0.5/12 items-center justify-start pl-3">
          <input
            disabled={!hasItems}
            readOnly
            checked={isAllSelected()}
            onClick={onSelectAllButtonClicked}
            type="checkbox"
            className="pointer-events-auto"
          />
        </div>
        <div className="box-content flex w-1/12 cursor-pointer items-center px-3" onClick={() => sortBy('type')}>
          {translate('drive.list.columns.type')}
          {order.by === 'type' && sortButtonFactory()}
        </div>
        <div className="flex flex-grow cursor-pointer items-center" onClick={() => sortBy('name')}>
          {translate('drive.list.columns.name')}
          {order.by === 'name' && sortButtonFactory()}
        </div>
        <div className="hidden w-2/12 items-center xl:flex"></div>
        <div className="hidden w-3/12 cursor-pointer items-center lg:flex" onClick={() => sortBy('updatedAt')}>
          {translate('drive.list.columns.modified')}
          {order.by === 'updatedAt' && sortButtonFactory()}
        </div>
        <div className="flex w-1/12 cursor-pointer items-center" onClick={() => sortBy('size')}>
          {translate('drive.list.columns.size')}
          {order.by === 'size' && sortButtonFactory()}
        </div>
        <div className="flex w-1/12 items-center rounded-tr-4px">{translate('drive.list.columns.actions')}</div>
      </div> */}
      <div className="h-full overflow-y-auto">
        {isLoading ? (
          loadingSkeleton()
        ) : (
          <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
            <div className="flex h-full w-full flex-col overflow-y-auto">
              <List<DriveItemData, 'type' | 'name' | 'updatedAt' | 'size'>
                header={[
                  {
                    label: 'Type',
                    width: 'flex w-1/12 cursor-pointer items-center px-3',
                    name: 'type',
                    orderable: true,
                    defaultDirection: 'ASC',
                  },
                  {
                    label: 'Name',
                    width: 'flex flex-grow cursor-pointer items-center pl-6',
                    name: 'name',
                    orderable: true,
                    defaultDirection: 'ASC',
                  },
                  {
                    label: 'Modified',
                    width: 'hidden w-3/12 lg:flex pl-4',
                    name: 'updatedAt',
                    orderable: true,
                    defaultDirection: 'ASC',
                  },
                  {
                    label: 'Size',
                    width: 'flex w-1/12 cursor-pointer items-center',
                    name: 'size',
                    orderable: true,
                    defaultDirection: 'ASC',
                  },
                ]}
                items={props.items}
                isLoading={isLoading}
                itemComposition={[(item) => <DriveExplorerListItem item={item} isTrash={props.isTrash} />]}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                skinSkeleton={loadingSkeleton()}
                emptyState={<div></div>}
                onNextPage={onEndOfScroll}
                hasMoreItems={hasMoreItems}
                menu={
                  props.selectedItems.length > 1 && !props.isTrash //extraer esta condicion a variable
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
                      : contextMenuTrashItems({
                          openPreview: (item: DriveItemData) => {
                            dispatch(uiActions.setIsFileViewerOpen(true));
                            dispatch(uiActions.setFileViewerItem(item));
                          },
                          restoreItem: (item: DriveItemData) => {
                            dispatch(storageActions.setItemsToMove([item]));
                            dispatch(uiActions.setIsMoveItemsDialogOpen(true));
                          },
                          deletePermanently: (item: DriveItemData) => {
                            dispatch(storageActions.setItemsToDelete([item]));
                            dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
                          },
                        })
                    : props.selectedItems.length === 1 && (props.selectedItems?.[0].shares?.length || 0) > 0 //extraer esta condicion a variable
                    ? contextMenuDriveItemShared({
                        openPreview: (item) => {
                          dispatch(uiActions.setIsFileViewerOpen(true));
                          dispatch(uiActions.setFileViewerItem(item as DriveItemData));
                        },
                        copyLink: (item) => {
                          dispatch(sharedThunks.getSharedLinkThunk({ item: item as DriveItemData }));
                        },
                        openLinkSettings: (item) => {
                          dispatch(
                            storageActions.setItemToShare({
                              share: (item as DriveItemData)?.shares?.[0],
                              item: item as DriveItemData,
                            }),
                          );
                          dispatch(uiActions.setIsShareItemDialogOpen(true));
                        },
                        deleteLink: (item) => {
                          dispatch(
                            sharedThunks.deleteLinkThunk({
                              linkId: (item as DriveItemData)?.shares?.[0]?.id as string,
                              item: item as DriveItemData,
                            }),
                          );
                        },
                        renameItem: (item) => {
                          dispatch(uiActions.setCurrentEditingNameDirty((item as DriveItemData).name));
                          dispatch(uiActions.setCurrentEditingNameDriveItem(item as DriveItemData));
                        },
                        moveItem: (item) => {
                          dispatch(storageActions.setItemsToMove([item as DriveItemData]));
                          dispatch(uiActions.setIsMoveItemsDialogOpen(true));
                        },
                        downloadItem: (item) => {
                          dispatch(storageThunks.downloadItemsThunk([item as DriveItemData]));
                        },
                        moveToTrash: (item) => {
                          moveItemsToTrash([item as DriveItemData]);
                        },
                      })
                    : contextMenuDriveNotSharedLink({
                        openPreview: (item: DriveItemData) => {
                          dispatch(uiActions.setIsFileViewerOpen(true));
                          dispatch(uiActions.setFileViewerItem(item));
                        },
                        getLink: (item: DriveItemData) => {
                          dispatch(sharedThunks.getSharedLinkThunk({ item }));
                        },
                        renameItem: (item: DriveItemData) => {
                          dispatch(uiActions.setCurrentEditingNameDirty(item.name));
                          dispatch(uiActions.setCurrentEditingNameDriveItem(item));
                        },
                        moveItem: (item: DriveItemData) => {
                          dispatch(storageActions.setItemsToMove([item]));
                          dispatch(uiActions.setIsMoveItemsDialogOpen(true));
                        },
                        downloadItem: (item: DriveItemData) => {
                          dispatch(storageThunks.downloadItemsThunk([item]));
                        },
                        moveToTrash: (item: DriveItemData) => {
                          moveItemsToTrash([item]);
                        },
                      })
                }
                selectedItems={props.selectedItems}
                keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
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
        )}
      </div>
    </div>
  );
});

export default connect((state: RootState) => ({
  selectedItems: state.storage.selectedItems,
  order: state.storage.order,
}))(DriveExplorerList);
