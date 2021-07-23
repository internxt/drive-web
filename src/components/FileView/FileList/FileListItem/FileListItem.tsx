import React, { Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';
import { Dropdown } from 'react-bootstrap';

import FileDropdownActions from '../../FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import './FileListItem.scss';
import dateService from '../../../../services/date.service';
import { AppDispatch, RootState } from '../../../../store';
import { deleteItemsThunk, selectItem, deselectItem, setItemToShare, setItemsToDelete, setInfoItem } from '../../../../store/slices/storageSlice';
import downloadService from '../../../../services/download.service';
import { UserSettings } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import { setIsDeleteItemsDialogOpen } from '../../../../store/slices/uiSlice';
import iconService from '../../../../services/icon.service';

interface FileListItemProps {
  user: UserSettings;
  item: any;
  selectedItems: number[];
  currentFolderId: number | null;
  dispatch: AppDispatch
}

interface FileListItemState {
  isEditingName: boolean;
  dirtyName: string;
  nameInputRef: React.RefObject<HTMLInputElement>;
}

class FileListItem extends React.Component<FileListItemProps, FileListItemState> {
  constructor(props: FileListItemProps) {
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
    this.onShareButtonClicked = this.onShareButtonClicked.bind(this);
    this.onInfoButtonClicked = this.onInfoButtonClicked.bind(this);
    this.onDeleteButtonClicked = this.onDeleteButtonClicked.bind(this);
    this.onSelectCheckboxChanged = this.onSelectCheckboxChanged.bind(this);
  }

  get nameNode(): JSX.Element {
    const { item } = this.props;
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const spanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <input className={`${isEditingName ? 'block' : 'hidden'} dense`} ref={nameInputRef} type="text" value={dirtyName} placeholder="Change name folder" onChange={this.onNameChanged} onBlur={this.onNameBlurred} onKeyPress={this.onEnterKeyPressed} autoFocus />
        <span className={`${spanDisplayClass} text-neutral-900 text-sm px-1`} onDoubleClick={this.onNameDoubleClicked}>{item.name}</span>
      </Fragment>
    );
  }

  get itemIconSrc(): string {
    return this.props.item.isFolder ?
      iconService.getIcon('folderBlue') :
      iconService.getIcon('defaultFile');
  }

  get isSelected(): boolean {
    const { item, selectedItems } = this.props;

    return selectedItems.includes(item.name);
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
  }

  onNameChanged(e: any): void {
    this.setState({ dirtyName: e.target.value });
  }

  onEnterKeyPressed(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      this.confirmNameChange();
    }
  }

  onSelectCheckboxChanged(e: any) {
    const { item, dispatch } = this.props;

    e.target.checked ?
      dispatch(selectItem(item.name)) :
      dispatch(deselectItem(item.name));
  }

  onRenameButtonClicked(): void {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => setTimeout(() => nameInputRef.current?.focus(), 0)
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

  render(): ReactNode {
    const { item } = this.props;

    return (
      <tr className="group file-list-item hover:bg-blue-10 border-b border-l-neutral-30 text-sm">
        <td className="px-4">
          <input type="checkbox" checked={this.isSelected} onChange={this.onSelectCheckboxChanged} />
        </td>
        <td>
          <img alt="" className="type-icon" src={this.itemIconSrc} />
        </td>
        <td>
          <div>
            <div className="mb-1">
              {this.nameNode}
            </div>
            <span className="block text-blue-60 text-xs px-1">Updated {dateService.fromNow(item.updatedAt)}</span>
          </div>
        </td>
        <td>{dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}</td>
        <td>{sizeService.bytesToString(item.size, false).toUpperCase()}</td>
        <td>
          <div className="flex justify-center">
            <button onClick={this.onDownloadButtonClicked} className="hover-action mr-4">
              <img alt="" src={iconService.getIcon('downloadItems')} />
            </button>
            <button onClick={this.onShareButtonClicked} className="hover-action mr-4">
              <img alt="" src={iconService.getIcon('shareItems')} />
            </button>
            <button onClick={this.onDeleteButtonClicked} className="hover-action">
              <img alt="" src={iconService.getIcon('deleteItems')} />
            </button>
          </div>
        </td>
        <td>
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button text-blue-60 bg-l-neutral-20 font-bold rounded-2xl">
              <img alt="" src={iconService.getIcon('actions')} />
            </Dropdown.Toggle>
            <FileDropdownActions
              onRenameButtonClicked={this.onRenameButtonClicked}
              onDownloadButtonClicked={this.onDownloadButtonClicked}
              onShareButtonClicked={this.onShareButtonClicked}
              onInfoButtonClicked={this.onInfoButtonClicked}
              onDeleteButtonClicked={this.onDeleteButtonClicked}
            />
          </Dropdown>
        </td>
      </tr>
    );
  }
}

export default connect(
  (state: RootState) => ({
    user: state.user.user,
    currentFolderId: state.storage.currentFolderId,
    selectedItems: state.storage.selectedItems
  }))(FileListItem);