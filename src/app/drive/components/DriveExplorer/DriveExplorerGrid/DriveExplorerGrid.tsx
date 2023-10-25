import React, { FC, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import DriveExplorerGridItem from '../DriveExplorerItem/DriveExplorerGridItem/DriveExplorerGridItem';
import { DriveItemData } from '../../../types';
import DriveGridItemSkeleton from '../../DriveGridItemSkeleton/DriveGridItemSkeleton';
import './DriveExplorerGrid.scss';
import InfiniteScroll from 'react-infinite-scroll-component';
import EditItemNameDialog from '../../EditItemNameDialog/EditItemNameDialog';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { useAppDispatch } from 'app/store/hooks';

interface DriveExplorerGridProps {
  folderId: number;
  isLoading: boolean;
  items: DriveItemData[];
  onEndOfScroll(): void;
  hasMoreItems: boolean;
}

const DriveExplorerGrid: FC<DriveExplorerGridProps> = (props: DriveExplorerGridProps) => {
  const [editNameItem, setEditNameItem] = React.useState<DriveItemData | null>(null);
  const dispatch = useAppDispatch();

  function loadingSkeleton(): JSX.Element[] {
    return Array(20)
      .fill(0)
      .map((n, i) => <DriveGridItemSkeleton key={i} />);
  }

  function itemsList(): JSX.Element[] {
    return props.items.map((item) => {
      const itemKey = `${item.isFolder ? 'folder' : 'file'}-${item.id}`;
      return <DriveExplorerGridItem setEditNameItem={setEditNameItem} key={itemKey} item={item} />;
    });
  }

  function itemsFileList(): JSX.Element[] {
    return props.items
      .filter((item) => !item.isFolder)
      .map((item) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'file'-${item.id}-${itemParentId}`;

        return <DriveExplorerGridItem setEditNameItem={setEditNameItem} key={itemKey} item={item} />;
      });
  }

  function itemsFolderList(): JSX.Element[] {
    return props.items
      .filter((item) => item.isFolder)
      .map((item) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'folder'-${item.id}-${itemParentId}`;

        return <DriveExplorerGridItem setEditNameItem={setEditNameItem} key={itemKey} item={item} />;
      });
  }

  const { isLoading, onEndOfScroll, hasMoreItems } = props;

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!isLoading && isFirstLoad) {
      isFirstLoad.current = false;
    }
  }, [isLoading, isFirstLoad]);

  return (
    <>
      {isLoading && isFirstLoad.current ? (
        <div className="files-grid flex-grow">{loadingSkeleton()}</div>
      ) : (
        <div id="scrollableList" className="h-full w-full overflow-y-auto py-6">
          {editNameItem && (
            <EditItemNameDialog
              item={editNameItem}
              isOpen={true}
              onSuccess={() => {
                dispatch(fetchSortedFolderContentThunk(props.folderId));
              }}
              onClose={() => {
                setEditNameItem(null);
              }}
            />
          )}
          <InfiniteScroll
            dataLength={itemsList().length}
            next={onEndOfScroll}
            hasMore={hasMoreItems}
            loader={loadingSkeleton()}
            scrollableTarget="scrollableList"
            className="files-grid z-0 flex-grow"
            style={{ overflow: 'visible' }}
            scrollThreshold={0.6}
          >
            {itemsFolderList()}
            {itemsFileList()}
          </InfiniteScroll>
        </div>
      )}
    </>
  );
};

export default connect()(DriveExplorerGrid);
