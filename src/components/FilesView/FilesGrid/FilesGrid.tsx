import React, { ReactNode } from 'react';
import { connect } from 'react-redux';

import FileGridItem from './FileGridItem/FileGridItem';
import { RootState } from '../../../store';

import './FilesGrid.scss';

interface FilesGridProps {
  items: any[];
}

interface FilesGridState { }

class FilesGrid extends React.Component<FilesGridProps, FilesGridState> {
  constructor(props: FilesGridProps) {
    super(props);

    this.state = {};
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item: any, index: number) =>
      <FileGridItem
        key={index}
        item={item}
      />);
  }

  render(): ReactNode {
    return (
      <div className="files-grid pointer-events-none flex-grow">
        {this.itemsList}
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    items: state.storage.items,
    selectedItems: state.storage.selectedItems
  }))(FilesGrid);