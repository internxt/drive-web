import React, { ReactNode } from 'react';
import { connect } from 'react-redux';

import DriveExplorerGridItem from '../DriveExplorerItem/DriveExplorerGridItem/DriveExplorerGridItem';
import { DriveItemData } from '../../../models/interfaces';
import DriveGridItemSkeleton from '../../loaders/DriveGridItemSkeleton';
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

  render(): ReactNode {
    const { isLoading } = this.props;

    return <div className="files-grid flex-grow">{isLoading ? this.loadingSkeleton : this.itemsList}</div>;
  }
}

export default connect()(DriveExplorerGrid);
