import React, { ReactNode } from 'react';
import { connect } from 'react-redux';

import DriveExplorerGridItem from '../DriveExplorerItem/DriveExplorerGridItem/DriveExplorerGridItem';
import { DriveItemData } from '../../../types';
import DriveGridItemSkeleton from '../../DriveGridItemSkeleton/DriveGridItemSkeleton';
import './DriveExplorerGrid.scss';
import InfiniteScroll from 'react-infinite-scroll-component';

interface DriveExplorerGridProps {
  isLoading: boolean;
  items: DriveItemData[];
  onEndOfScroll(): void;
  hasMoreItems: boolean;
}

class DriveExplorerGrid extends React.Component<DriveExplorerGridProps> {
  constructor(props: DriveExplorerGridProps) {
    super(props);
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(20)
      .fill(0)
      .map((n, i) => <DriveGridItemSkeleton key={i} />);
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item) => {
      const itemKey = `${item.isFolder ? 'folder' : 'file'}-${item.id}`;
      return <DriveExplorerGridItem key={itemKey} item={item} />;
    });
  }

  get itemsFileList(): JSX.Element[] {
    return this.props.items
      .filter((item) => !item.isFolder)
      .map((item) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'file'-${item.id}-${itemParentId}`;

        return <DriveExplorerGridItem key={itemKey} item={item} />;
      });
  }

  get itemsFolderList(): JSX.Element[] {
    return this.props.items
      .filter((item) => item.isFolder)
      .map((item) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'folder'-${item.id}-${itemParentId}`;

        return <DriveExplorerGridItem key={itemKey} item={item} />;
      });
  }

  render(): ReactNode {
    const { isLoading, onEndOfScroll, hasMoreItems } = this.props;

    return (
      <>
        {isLoading ? (
          <div className="files-grid flex-grow">this.loadingSkeleton</div>
        ) : (
          <div id="scrollableList" className="h-full w-full overflow-y-auto py-6">
            <InfiniteScroll
              dataLength={this.itemsList.length}
              next={onEndOfScroll}
              hasMore={hasMoreItems}
              loader={this.loadingSkeleton}
              scrollableTarget="scrollableList"
              className="files-grid flex-grow"
            >
              {this.itemsFolderList}
              {this.itemsFileList}
            </InfiniteScroll>
          </div>
        )}
      </>
    );
  }
}

export default connect()(DriveExplorerGrid);
