import React from 'react';

import FileList from './FileList/FileList';
import FileGrid from './FileGrid/FileGrid';

import { FileViewModes } from './models/enums';

import './FileView.scss';

interface FileViewProps { }

interface FileViewState {
  viewMode: FileViewModes;
}

class FileView extends React.Component<FileViewProps, FileViewState> {
  constructor(props: FileViewProps) {
    super(props);

    this.state = {
      viewMode: FileViewModes.Grid
    };
  }

  onPreviousPageButtonClicked(): void {
    console.log('previous page button clicked!');
  }

  onNextPageButtonClicked(): void {
    console.log('next page button clicked!');
  }

  render() {
    const { viewMode } = this.state;
    const viewModes = {
      list: <FileList />,
      grid: <FileGrid />
    };

    return (
      <div>
        <div className="flex items-center border pt-2 pb-8">
          <div className="navigation-buttons flex border ">
            <button className="navigation-button bg-l-neutral-20 mr-1">
              B
            </button>
            <button className="navigation-button bg-l-neutral-20">
              N
            </button>
          </div>
        </div>

        { viewModes[viewMode]}

        <div className="flex justify-center mt-16">
          <div onClick={this.onPreviousPageButtonClicked} className="pagination-button">
            {'<<'}
          </div>
          <div className="pagination-button">
            1
          </div>
          <div onClick={this.onNextPageButtonClicked} className="pagination-button">
            {'>>'}
          </div>
        </div>
      </div>
    );
  }
}

export default FileView;