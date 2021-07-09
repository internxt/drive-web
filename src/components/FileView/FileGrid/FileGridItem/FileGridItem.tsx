import React from 'react';

import folderIcon from '../../../../assets/icons/folder.svg';

import './FileGridItem.scss';

interface FileGridItemProps { }

interface FileGridItemState { }

class FileGridItem extends React.Component<FileGridItemProps, FileGridItemState> {
  constructor(props: FileGridItemProps) {
    super(props);

    this.state = {};

    this.onOptionsButtonClicked = this.onOptionsButtonClicked.bind(this);
  }

  componentDidMount() { }

  onOptionsButtonClicked() {
    console.log('Options button clicked!');
  }

  render() {
    return (
      <div className="group file-grid-item">
        <button onClick={this.onOptionsButtonClicked} className="file-grid-item-actions-button">
          ...
        </button>
        <img className="file-icon m-auto" src={folderIcon} />
        <div className="text-center mt-1">
          <span className="block text-sm text-neutral-900">
            FilesPending
          </span>
          <span className="block text-xs text-blue-60">
            2 weeks ago
          </span>
        </div>
      </div>
    );
  }
}

export default FileGridItem;