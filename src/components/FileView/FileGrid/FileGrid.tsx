import React, { ReactNode } from 'react';

import FileGridItem from './FileGridItem/FileGridItem';

import './FileGrid.scss';
import { RootState } from '../../../store';
import { connect } from 'react-redux';

interface FileGridProps {
  items: any[];
}

interface FileGridState { }

class FileGrid extends React.Component<FileGridProps, FileGridState> {
  constructor(props: FileGridProps) {
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
      <div className="file-grid pointer-events-none grid flex-wrap justify-between gap-5 flex-grow bg-white">
        {this.itemsList}
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    items: state.storage.items,
    selectedItems: state.storage.selectedItems
  }))(FileGrid);