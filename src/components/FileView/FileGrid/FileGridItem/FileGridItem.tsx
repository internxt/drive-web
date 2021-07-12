import React, { Fragment } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import FileDropdownActions from '../../FileDropdownActions/FileDropdownActions';
import folderIcon from '../../../../assets/icons/folder.svg';

import './FileGridItem.scss';

interface FileGridItemState {
  isEditingName: boolean;
  dirtyName: string;
  nameInputRef: React.RefObject<HTMLInputElement>;
}

interface FileGridItemProps {}

class FileGridItem extends React.Component<FileGridItemProps, FileGridItemState> {
  constructor(props: FileGridItemProps) {
    super(props);

    this.state = {
      isEditingName: false,
      dirtyName: '',
      nameInputRef: React.createRef()
    };

    this.onOptionsButtonClicked = this.onOptionsButtonClicked.bind(this);
    this.onNameDoubleClicked = this.onNameDoubleClicked.bind(this);
    this.onNameBlurred = this.onNameBlurred.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.onEnterKeyPressed = this.onEnterKeyPressed.bind(this);
    this.onRenameButtonClicked = this.onRenameButtonClicked.bind(this);
    this.onDownloadButtonClicked = this.onDownloadButtonClicked.bind(this);
    this.onInfoButtonClicked = this.onInfoButtonClicked.bind(this);
    this.onDeleteButtonClicked = this.onDeleteButtonClicked.bind(this);
    this.onShareButtonClicked = this.onShareButtonClicked.bind(this);
  }

  get nameNode(): JSX.Element {
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const ṣpanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <input ref={nameInputRef} className={isEditingName ? 'block' : 'hidden'} type="text" value={dirtyName} placeholder="Change name folder" onChange={this.onNameChanged} onBlur={this.onNameBlurred} onKeyPress={this.onEnterKeyPressed} autoFocus />
        <span onDoubleClick={this.onNameDoubleClicked} className={`${ṣpanDisplayClass} text-neutral-900 text-sm px-1`} >FilesPending.png</span>
      </Fragment>
    );
  }

  onOptionsButtonClicked(): void {
    console.log('Options button clicked!');
  }

  onNameDoubleClicked(): void {
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: '' },
      () => nameInputRef.current && nameInputRef.current.focus()
    );
  }

  onNameBlurred(): void {
    console.log('on Name blurred!');
    this.setState({ isEditingName: false });
  }

  onNameChanged(e: any): void {
    this.setState({ dirtyName: e.target.value });
  }

  onEnterKeyPressed(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      // TODO: save name change
    }
  }

  onRenameButtonClicked(): void {
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true },
      () => setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 0)
    );
  }

  onDownloadButtonClicked(): void {
    console.log('download button clicked!');
  }

  onShareButtonClicked(): void {
    console.log('share button clicked!');
  }

  onInfoButtonClicked(): void {
    console.log('info button clicked!');
  }

  onDeleteButtonClicked(): void {
    console.log('delete button clicked!');
  }

  render() {
    return (
      <div className="group file-grid-item">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-grid-item-actions-button">
            ···
          </Dropdown.Toggle>
          <FileDropdownActions
            onRenameButtonClicked={this.onRenameButtonClicked}
            onDownloadButtonClicked={this.onDownloadButtonClicked}
            onShareButtonClicked={this.onShareButtonClicked}
            onInfoButtonClicked={this.onInfoButtonClicked}
            onDeleteButtonClicked={this.onDeleteButtonClicked}
          />
        </Dropdown>
        <img className="file-icon m-auto" src={folderIcon} />
        <div className="text-center mt-3">
          <div className="h-5 mb-1">
            {this.nameNode}
          </div>
          <span className="block text-xs text-blue-60 px-1">
            2 weeks ago
          </span>
        </div>
      </div>
    );
  }
}

export default FileGridItem;