import React, { ReactNode } from 'react';

import FileGridItem from './FileGridItem/FileGridItem';

import './FileGrid.scss';

interface FileGridProps { }

interface FileGridState { }

class FileGrid extends React.Component<FileGridProps, FileGridState> {
  constructor(props: FileGridProps) {
    super(props);

    this.state = {};
  }

  render(): ReactNode {
    return (
      <div className="file-grid grid flex-wrap justify-between gap-5">
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
        <FileGridItem />
      </div>
    );
  }
}

export default FileGrid;