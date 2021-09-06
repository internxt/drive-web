import React, { ReactNode } from 'react';
import { connect } from 'react-redux';

import FileGridItem from '../FileExplorerItem/FileGridItem/FileGridItem';
import { DriveItemData } from '../../../models/interfaces';
import DriveGridItemSkeleton from '../../skinSkeleton/DriveGridItemSkeleton';
import './FilesGrid.scss';

interface FilesGridProps {
  isLoading: boolean;
  items: DriveItemData[];
}

class FilesGrid extends React.Component<FilesGridProps> {
  constructor(props: FilesGridProps) {
    super(props);
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveGridItemSkeleton key={i} />);
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item, index) => <FileGridItem key={index} item={item} />);
  }

  render(): ReactNode {
    const { isLoading } = this.props;

    return <div className="files-grid flex-grow">{isLoading ? this.loadingSkeleton : this.itemsList}</div>;
  }
}

export default connect()(FilesGrid);
