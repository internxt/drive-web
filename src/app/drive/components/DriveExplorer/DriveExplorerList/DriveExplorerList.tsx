import React, { ReactNode } from 'react';
import UilArrowDown from '@iconscout/react-unicons/icons/uil-arrow-down';
import UilArrowUp from '@iconscout/react-unicons/icons/uil-arrow-up';
import { connect } from 'react-redux';

import DriveExplorerListItem from '../DriveExplorerItem/DriveExplorerListItem/DriveExplorerListItem';
import { AppDispatch, RootState } from '../../../../store';
import { storageActions } from '../../../../store/slices/storage';
import i18n from '../../../../i18n/services/i18n.service';
import { DriveItemData } from '../../../types';
import { OrderDirection, OrderSettings } from '../../../../core/types';
import DriveListItemSkeleton from '../../DriveListItemSkeleton/DriveListItemSkeleton';
import InfiniteScroll from 'react-infinite-scroll-component';

interface DriveExplorerListProps {
  isLoading: boolean;
  items: DriveItemData[];
  selectedItems: DriveItemData[];
  order: OrderSettings;
  dispatch: AppDispatch;
  onEndOfScroll(): void;
  hasMoreItems: boolean;
}

class DriveExplorerList extends React.Component<DriveExplorerListProps> {
  constructor(props: DriveExplorerListProps) {
    super(props);
  }

  get hasItems(): boolean {
    return this.props.items.length > 0;
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item: DriveItemData) => {
      const itemParentId = item.parentId || item.folderId;
      const itemKey = `${item.isFolder ? 'folder' : 'file'}-${item.id}-${itemParentId}`;

      return <DriveExplorerListItem key={itemKey} item={item} />;
    });
  }

  get itemsFileList(): JSX.Element[] {
    return this.props.items
      .filter((item) => !item.isFolder)
      .map((item: DriveItemData) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'file'-${item.id}-${itemParentId}`;

        return <DriveExplorerListItem key={itemKey} item={item} />;
      });
  }

  get itemsFolderList(): JSX.Element[] {
    return this.props.items
      .filter((item) => item.isFolder)
      .map((item: DriveItemData) => {
        const itemParentId = item.parentId || item.folderId;
        const itemKey = `'folder'-${item.id}-${itemParentId}`;

        return <DriveExplorerListItem key={itemKey} item={item} />;
      });
  }

  get isAllSelected(): boolean {
    const { selectedItems, items } = this.props;

    return selectedItems.length === items.length && items.length > 0;
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(20)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  }

  onSelectAllButtonClicked = () => {
    const { dispatch, items } = this.props;

    this.isAllSelected ? dispatch(storageActions.clearSelectedItems()) : dispatch(storageActions.selectItems(items));
  };

  render(): ReactNode {
    const { dispatch, isLoading, order, hasMoreItems, onEndOfScroll } = this.props;

    const sortBy = (orderBy: string) => {
      const direction =
        order.by === orderBy
          ? order.direction === OrderDirection.Desc
            ? OrderDirection.Asc
            : OrderDirection.Desc
          : OrderDirection.Asc;
      dispatch(storageActions.setOrder({ by: orderBy, direction }));
    };
    const sortButtonFactory = () => {
      const IconComponent = order.direction === OrderDirection.Desc ? UilArrowDown : UilArrowUp;
      return <IconComponent className="ml-2" />;
    };

    return (
      <div className="flex h-full flex-grow flex-col bg-white">
        <div className="files-list flex border-b border-neutral-30 bg-white py-3 text-sm font-semibold text-neutral-500">
          <div className="box-content flex w-0.5/12 items-center justify-start pl-3">
            <input
              disabled={!this.hasItems}
              readOnly
              checked={this.isAllSelected}
              onClick={this.onSelectAllButtonClicked}
              type="checkbox"
              className="pointer-events-auto"
            />
          </div>
          <div className="box-content flex w-1/12 cursor-pointer items-center px-3" onClick={() => sortBy('type')}>
            {i18n.get('drive.list.columns.type')}
            {order.by === 'type' && sortButtonFactory()}
          </div>
          <div className="flex flex-grow cursor-pointer items-center" onClick={() => sortBy('name')}>
            {i18n.get('drive.list.columns.name')}
            {order.by === 'name' && sortButtonFactory()}
          </div>
          <div className="hidden w-2/12 items-center xl:flex"></div>
          <div className="hidden w-3/12 cursor-pointer items-center lg:flex" onClick={() => sortBy('updatedAt')}>
            {i18n.get('drive.list.columns.modified')}
            {order.by === 'updatedAt' && sortButtonFactory()}
          </div>
          <div className="flex w-1/12 cursor-pointer items-center" onClick={() => sortBy('size')}>
            {i18n.get('drive.list.columns.size')}
            {order.by === 'size' && sortButtonFactory()}
          </div>
          <div className="flex w-1/12 items-center rounded-tr-4px">{i18n.get('drive.list.columns.actions')}</div>
        </div>
        <div className="h-full overflow-y-auto">
          {isLoading ? (
            this.loadingSkeleton
          ) : (
            <div id="scrollableList" className="h-full overflow-y-auto">
              <InfiniteScroll
                dataLength={this.itemsList.length}
                next={onEndOfScroll}
                hasMore={hasMoreItems}
                loader={this.loadingSkeleton}
                scrollableTarget="scrollableList"
                className="h-full"
              >
                {this.itemsFolderList}
                {this.itemsFileList}
              </InfiniteScroll>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  selectedItems: state.storage.selectedItems,
  order: state.storage.order,
}))(DriveExplorerList);
