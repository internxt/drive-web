import React, { FC } from 'react';
import { connect } from 'react-redux';

import DriveExplorerGridItem from '../DriveExplorerItem/DriveExplorerGridItem/DriveExplorerGridItem';
import { DriveItemData } from '../../../types';
import DriveGridItemSkeleton from '../../DriveGridItemSkeleton/DriveGridItemSkeleton';
import './DriveExplorerGrid.scss';
import InfiniteScroll from 'react-infinite-scroll-component';

interface DriveExplorerGridProps {
  folderId: number;
  isLoading: boolean;
  items: DriveItemData[];
  onEndOfScroll(): void;
  hasMoreItems: boolean;
}

const DriveExplorerGrid: FC<DriveExplorerGridProps> = (props: DriveExplorerGridProps) => {
  function loadingSkeleton(): JSX.Element[] {
    return Array(20)
      .fill(0)
      .map((n, i) => <DriveGridItemSkeleton key={i} />);
  }

  function itemsList(): JSX.Element[] {
    return props.items.map((item) => {
      const itemKey = `${item.isFolder ? 'folder' : 'file'}-${item.id}`;
      return <DriveExplorerGridItem key={itemKey} item={item} />;
    });
  }

  function itemsFileList(): JSX.Element[] {
    return props.items
      .filter((item) => !item.isFolder)
      .map((item) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'file'-${item.id}-${itemParentId}`;

        return <DriveExplorerGridItem key={itemKey} item={item} />;
      });
  }

  function itemsFolderList(): JSX.Element[] {
    return props.items
      .filter((item) => item.isFolder)
      .map((item) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'folder'-${item.id}-${itemParentId}`;

        return <DriveExplorerGridItem key={itemKey} item={item} />;
      });
  }

  const { isLoading, onEndOfScroll, hasMoreItems } = props;

  return (
    <>
      {isLoading ? (
        <div className="files-grid flex-grow">{loadingSkeleton()}</div>
      ) : (
        <div id="scrollableList" className="h-full w-full overflow-y-auto py-6">
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
