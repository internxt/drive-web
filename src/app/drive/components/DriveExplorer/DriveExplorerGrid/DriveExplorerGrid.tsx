import React, { ReactNode } from 'react';
import { connect } from 'react-redux';

import DriveExplorerGridItem from '../DriveExplorerItem/DriveExplorerGridItem/DriveExplorerGridItem';
import { DriveItemData } from '../../../types';
import DriveGridItemSkeleton from '../../DriveGridItemSkeleton/DriveGridItemSkeleton';
import './DriveExplorerGrid.scss';

interface DriveExplorerGridProps {
  isLoading: boolean;
  items: DriveItemData[];
}

class DriveExplorerGrid extends React.Component<DriveExplorerGridProps> {
  constructor(props: DriveExplorerGridProps) {
    super(props);
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(10)
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
    return this.props.items.filter((item) => !item.isFolder).map((item) => {
      const itemParentId = item.parentId || item.folderId;
      const itemKey = `'file'-${item.id}-${itemParentId}`;

      return <DriveExplorerGridItem key={itemKey} item={item} />;
    });
  }

  get itemsFolderList(): JSX.Element[] {
    return this.props.items.filter((item) => item.isFolder).map((item) => {
      const itemParentId = item.parentId || item.folderId;
      const itemKey = `'folder'-${item.id}-${itemParentId}`;

      return <DriveExplorerGridItem key={itemKey} item={item} />;
    });
  }

  render(): ReactNode {
    const { isLoading } = this.props;

    return <div className="files-grid flex-grow">{isLoading ? (
      this.loadingSkeleton
    ) : (
      <>
        { this.itemsFolderList}
        { this.itemsFileList}
      </>
    )}</div>;
  }
}

export default connect()(DriveExplorerGrid);
