import React, { ReactNode } from 'react';

import Dropdown from 'react-bootstrap/Dropdown';

import './FileDropdownActions.scss';

interface FileDropdownActionsProps {
  onRenameButtonClicked: () => void;
  onDownloadButtonClicked: () => void;
  onShareButtonClicked: () => void;
  onInfoButtonClicked: () => void;
  onDeleteButtonClicked: () => void;
}

interface FileDropdownActionsState { }

class FileGridItem extends React.Component<FileDropdownActionsProps, FileDropdownActionsState> {
  constructor(props: FileDropdownActionsProps) {
    super(props);

    this.state = {};

    this.onDownloadButtonClicked = this.onDownloadButtonClicked.bind(this);
    this.onRenameButtonClicked = this.onRenameButtonClicked.bind(this);
    this.onShareButtonClicked = this.onShareButtonClicked.bind(this);
    this.onInfoButtonClicked = this.onInfoButtonClicked.bind(this);
    this.onDeleteButtonClicked = this.onDeleteButtonClicked.bind(this);
  }

  onDownloadButtonClicked(): void {
    const { onDownloadButtonClicked } = this.props;

    onDownloadButtonClicked && onDownloadButtonClicked();
  }

  onRenameButtonClicked(): void {
    const { onRenameButtonClicked } = this.props;

    onRenameButtonClicked && onRenameButtonClicked();
  }

  onShareButtonClicked(): void {
    const { onShareButtonClicked } = this.props;

    onShareButtonClicked && onShareButtonClicked();
  }

  onInfoButtonClicked(): void {
    const { onInfoButtonClicked } = this.props;

    onInfoButtonClicked && onInfoButtonClicked();
  }

  onDeleteButtonClicked(): void {
    const { onDeleteButtonClicked } = this.props;

    onDeleteButtonClicked && onDeleteButtonClicked();
  }

  render(): ReactNode {
    return (
      <Dropdown.Menu className="file-dropdown-actions">
        <span className="text-supporting-2 mb-1">Folder actions</span>
        <Dropdown.Item
          id="download"
          className="file-dropdown-actions-button"
          onClick={this.onDownloadButtonClicked}
        >
          Download
        </Dropdown.Item>
        <Dropdown.Item
          id="rename"
          className="file-dropdown-actions-button"
          onClick={this.onRenameButtonClicked}
        >
          Rename
        </Dropdown.Item>
        <Dropdown.Item
          id="share"
          className="file-dropdown-actions-button"
          onClick={this.onShareButtonClicked}
        >
          Share
        </Dropdown.Item>
        <Dropdown.Item
          id="info"
          className="file-dropdown-actions-button"
          onClick={this.onInfoButtonClicked}
        >
          Info
        </Dropdown.Item>
        <Dropdown.Item
          id="info"
          className="file-dropdown-actions-button"
          onClick={this.onInfoButtonClicked}
        >
          Delete
        </Dropdown.Item>
      </Dropdown.Menu>
    );
  }
}

export default FileGridItem;