import React from 'react';

import folderIcon from '../../../../assets/icons/folder.svg';

import './FileListItem.scss';

interface FileListItemProps { }

interface FileListItemState {
  isEditing: boolean;
  dirtyName: string;
}

class FileListItem extends React.Component<FileListItemProps, FileListItemState> {
  constructor(props: FileListItemProps) {
    super(props);

    this.state = {
      isEditing: false,
      dirtyName: ''
    };

    this.onNameDoubleClicked = this.onNameDoubleClicked.bind(this);
    this.onNameBlurred = this.onNameBlurred.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.onEnterKeyPressed = this.onEnterKeyPressed.bind(this);
    this.onDownloadButtonClicked = this.onDownloadButtonClicked.bind(this);
    this.onShareButtonClicked = this.onShareButtonClicked.bind(this);
    this.onRemoveButtonClicked = this.onRemoveButtonClicked.bind(this);
  }

  componentDidMount() { }

  getNameNode() {
    const { isEditing, dirtyName } = this.state;

    return (
      isEditing ?
        <input type="text" value={dirtyName} placeholder="Change name folder" onChange={this.onNameChanged} onBlur={this.onNameBlurred}onKeyPress={this.onEnterKeyPressed} autoFocus /> :
        <span onDoubleClick={this.onNameDoubleClicked} className="block text-neutral-900 text-sm px-1">FilesPending</span>
    );
  }

  onNameDoubleClicked() {
    this.setState({ isEditing: true, dirtyName: '' });
  }

  onNameBlurred() {
    this.setState({ isEditing: false });
  }

  onNameChanged(e: any) {
    this.setState({ dirtyName: e.target.value });
  }

  onEnterKeyPressed(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      // TODO: save name change
    }
  }

  onDownloadButtonClicked() {
    console.log('download button clicked!');
  }

  onShareButtonClicked() {
    console.log('share button clicked!');
  }

  onRemoveButtonClicked() {
    console.log('remove button clicked!');
  }

  render() {
    const nameNode = this.getNameNode();

    return (
      <tr className="group file-list-item hover:bg-blue-10 border-b border-l-neutral-30 text-sm">
        <td className="px-4">
          <input type="checkbox" />
        </td>
        <td>
          <img className="type-icon" src={folderIcon} />
        </td>
        <td>
          <div>
            <div className="mb-1">
              {nameNode}
            </div>
            <span className="block text-blue-60 text-xs px-1">Updated 2 weeks ago</span>
          </div>
        </td>
        <td>12 July 2021. 14:57</td>
        <td>30MB</td>
        <td>
          <div className="flex justify-center">
            <button onClick={this.onDownloadButtonClicked} className="hover-action mr-4">D</button>
            <button onClick={this.onShareButtonClicked} className="hover-action mr-4">S</button>
            <button onClick={this.onRemoveButtonClicked} className="hover-action">R</button>
          </div>
        </td>
        <td>
          <button className="actions-button text-blue-60 bg-l-neutral-20 font-bold rounded-2xl">...</button>
        </td>
      </tr>
    );
  }
}

export default FileListItem;