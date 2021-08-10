import React, { ReactNode } from 'react';
import { connect } from 'react-redux';

import FileGridItem from './FileGridItem/FileGridItem';
import { RootState } from '../../../store';

import './FilesGrid.scss';
import { DriveItemData } from '../../../models/interfaces';
import DriveGridItemSkeleton from '../../skinSkeleton/DriveGridItemSkeleton';

interface FilesGridProps {
  isLoading: boolean;
  items: DriveItemData[];
}

interface FilesGridState { }

class FilesGrid extends React.Component<FilesGridProps, FilesGridState> {
  constructor(props: FilesGridProps) {
    super(props);

    this.state = {};
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(10).fill(0).map((n, i) => (
      <DriveGridItemSkeleton key={i}/>
    ));
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item: any, index: number) =>
      <FileGridItem
        key={index}
        item={item}
      />);
  }

  render(): ReactNode {
    const { isLoading } = this.props;

    return (
      <div className="files-grid flex-grow">
        {isLoading ? this.loadingSkeleton : this.itemsList}
      </div>
    );
  }
}

export default connect((state: RootState) => ({}))(FilesGrid);