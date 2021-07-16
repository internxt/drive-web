import React, { Fragment } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import FileDropdownActions from '../../FileDropdownActions/FileDropdownActions';
import iconService, { IconType } from '../../../../services/icon.service';
import { selectItem, deselectItem, setItemToShare, setItemsToDelete, setInfoItem } from '../../../../store/slices/storageSlice';

import dateService from '../../../../services/date.service';

import './FileGridItem.scss';
import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import { AppDispatch, RootState } from '../../../../store';
import { connect } from 'react-redux';
import { UserSettings } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import { setIsDeleteItemsDialogOpen } from '../../../../store/slices/uiSlice';

interface FileGridItemProps {
  user: UserSettings;
  item: any;
  selectedItems: number[];
  currentFolderId: number | null;
  dispatch: AppDispatch;
}

interface FileGridItemState {
  isEditingName: boolean;
  dirtyName: string;
  nameInputRef: React.RefObject<HTMLInputElement>;
}

class FileGridItem extends React.Component<FileGridItemProps, FileGridItemState> {
  constructor(props: FileGridItemProps) {
    super(props);

    this.state = {
      isEditingName: false,
      dirtyName: '',
      nameInputRef: React.createRef()
    };

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
    const { item } = this.props;
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const ṣpanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <input ref={nameInputRef} className={isEditingName ? 'block' : 'hidden'} type="text" value={dirtyName} placeholder="Change name folder" onChange={this.onNameChanged} onBlur={this.onNameBlurred} onKeyPress={this.onEnterKeyPressed} autoFocus />
        <span onDoubleClick={this.onNameDoubleClicked} className={`${ṣpanDisplayClass} text-neutral-900 text-sm px-1`} >{item.name}</span>
      </Fragment>
    );
  }

  get itemIconSrc(): string {
    return this.props.item.isFolder ?
      iconService.getIcon(IconType.FolderBlue) :
      iconService.getIcon(IconType.DefaultFile);
  }

  confirmNameChange() {
    const { user, item, currentFolderId } = this.props;
    const { dirtyName, nameInputRef } = this.state;
    const data = JSON.stringify({ metadata: { itemName: dirtyName } });

    try {
      if (item.name !== dirtyName) {
        if (item.isFolder) {
          folderService.updateMetaData(item.id, data)
            .then(() => {
              // TODO: update folder content this.getFolderContent(currentFolderId, false, true, user.teams);
            });
        } else {
          fileService.updateMetaData(item.fileId, data).then(() => {
            // TODO: update folder content this.getFolderContent(currentFolderId, false, true, user.teams);
          });
        }
      }
    } catch (e) {
      console.log('Error during folder/file name change: ', e);
    } finally {
      nameInputRef.current?.blur();
    }
  }

  onNameDoubleClicked(): void {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => nameInputRef.current?.focus()
    );
  }

  onNameBlurred(): void {
    this.setState({ isEditingName: false });
    console.log('name blurred!');
  }

  onNameChanged(e: any): void {
    this.setState({ dirtyName: e.target.value });
  }

  onEnterKeyPressed(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      this.confirmNameChange();
    }
  }

  onRenameButtonClicked(): void {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 0)
    );
  }

  onDownloadButtonClicked(): void {
    downloadService.downloadFile(this.props.item);
  }

  onShareButtonClicked(): void {
    const { dispatch, item } = this.props;

    dispatch(setItemToShare(item.id));
  }

  onInfoButtonClicked(): void {
    this.props.dispatch(setInfoItem(this.props.item.id));
  }

  onDeleteButtonClicked(): void {
    const { dispatch, item } = this.props;

    dispatch(setItemsToDelete([item.id]));
    dispatch(setIsDeleteItemsDialogOpen(true));
  }

  render() {
    const { item } = this.props;

    return (
      <div className="group file-grid-item">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-grid-item-actions-button">
            <img className="m-auto" src={iconService.getIcon(IconType.Actions)} />
          </Dropdown.Toggle>
          <FileDropdownActions
            onRenameButtonClicked={this.onRenameButtonClicked}
            onDownloadButtonClicked={this.onDownloadButtonClicked}
            onShareButtonClicked={this.onShareButtonClicked}
            onInfoButtonClicked={this.onInfoButtonClicked}
            onDeleteButtonClicked={this.onDeleteButtonClicked}
          />
        </Dropdown>
        <img className="file-icon m-auto" src={this.itemIconSrc} />
        <div className="text-center mt-3">
          <div className="h-5 mb-1">
            {this.nameNode}
          </div>
          <span className="block text-xs text-blue-60 px-1">
            {dateService.fromNow(item.updatedAt)}
          </span>
        </div>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    user: state.user.user,
    currentFolderId: state.storage.currentFolderId,
    selectedItems: state.storage.selectedItems
  }))(FileGridItem);