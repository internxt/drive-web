import React, { DragEvent, Fragment, ReactNode } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import FileDropdownActions from '../../FileDropdownActions/FileDropdownActions';
import iconService, { IconType } from '../../../../services/icon.service';
import { storageActions, storageThunks } from '../../../../store/slices/storage';

import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import { AppDispatch, RootState } from '../../../../store';
import { connect } from 'react-redux';
import { UserSettings } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import { setIsDeleteItemsDialogOpen } from '../../../../store/slices/ui';

import './FileGridItem.scss';

interface FileGridItemProps {
  user: UserSettings;
  item: any;
  isDraggingAnItem: boolean;
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
  }

  get nameNode(): JSX.Element {
    const { item } = this.props;
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const ṣpanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <input
          ref={nameInputRef}
          className={`${isEditingName ? 'block' : 'hidden'} dense w-full`}
          type="text" value={dirtyName}
          placeholder="Change name folder"
          onChange={this.onNameChanged}
          onBlur={this.onNameBlurred}
          onKeyPress={this.onEnterKeyPressed}
          autoFocus
        />
        <span
          onDoubleClick={this.onNameDoubleClicked}
          className={`${ṣpanDisplayClass} whitespace-nowrap overflow-hidden overflow-ellipsis text-neutral-900 text-sm px-1`}
        >{item.name}</span>
      </Fragment>
    );
  }

  get itemIconSrc(): string {
    return this.props.item.isFolder ?
      iconService.getIcon(IconType.FolderBlue) :
      iconService.getIcon(IconType.DefaultFile);
  }

  confirmNameChange() {
    const { item } = this.props;
    const { dirtyName, nameInputRef } = this.state;
    const data = JSON.stringify({ metadata: { itemName: dirtyName } });

    try {
      if (item.name !== dirtyName) {
        if (item.isFolder) {
          folderService.updateMetaData(item.id, data)
            .then(() => {
              this.props.dispatch(
                storageThunks.fetchFolderContentThunk()
              );
            });
        } else {
          fileService.updateMetaData(item.fileId, data).then(() => {
            this.props.dispatch(
              storageThunks.fetchFolderContentThunk()
            );
          });
        }
      }
    } catch (e) {
      console.log('Error during folder/file name change: ', e);
    } finally {
      nameInputRef.current?.blur();
    }
  }

  onNameDoubleClicked = (e: MouseEvent): void => {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    e.stopPropagation();

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => nameInputRef.current?.focus()
    );
  }

  onNameBlurred = (): void => {
    this.setState({ isEditingName: false });
  }

  onNameChanged = (e: any): void => {
    this.setState({ dirtyName: e.target.value });
  }

  onEnterKeyPressed = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.confirmNameChange();
    }
  }

  onRenameButtonClicked = (): void => {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 0)
    );
  }

  onDownloadButtonClicked = (): void => {
    downloadService.downloadFile(this.props.item);
  }

  onShareButtonClicked = (): void => {
    const { dispatch, item } = this.props;

    dispatch(storageActions.setItemToShare(item.id));
  }

  onInfoButtonClicked = (): void => {
    this.props.dispatch(storageActions.setInfoItem(this.props.item.id));
  }

  onDeleteButtonClicked = (): void => {
    const { dispatch, item } = this.props;

    dispatch(storageActions.setItemsToDelete([item.id]));
    dispatch(setIsDeleteItemsDialogOpen(true));
  }

  onItemDoubleClicked = (): void => {
    const { dispatch, item } = this.props;

    dispatch(storageThunks.goToFolderThunk(item.id));
  }

  onItemDragEnter = (e: DragEvent<HTMLDivElement>): void => {
    console.log('onItemDragEnter!');

    this.props.dispatch(storageActions.setIsDraggingAnItem(true));
    // TODO: save target item data

    e.preventDefault();
  }

  onItemDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    this.props.dispatch(storageActions.setIsDraggingAnItem(false));
  }

  onItemDrop = (e: DragEvent<HTMLDivElement>): void => {
    console.log('onItemDrop!');
  }

  render(): ReactNode {
    const { isDraggingAnItem } = this.props;
    const { item } = this.props;

    return (
      <div
        className={`${isDraggingAnItem ? 'pointer-events-none only descendants' : 'pointer-events-auto'} group file-grid-item`}
        onDoubleClick={this.onItemDoubleClicked}
        onDragEnter={this.onItemDragEnter}
        onDragLeave={this.onItemDragLeave}
        onDrop={this.onItemDrop}
      >
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-grid-item-actions-button">
            <img alt="" className="m-auto" src={iconService.getIcon(IconType.Actions)} />
          </Dropdown.Toggle>
          <FileDropdownActions
            onRenameButtonClicked={this.onRenameButtonClicked}
            onDownloadButtonClicked={this.onDownloadButtonClicked}
            onShareButtonClicked={this.onShareButtonClicked}
            onInfoButtonClicked={this.onInfoButtonClicked}
            onDeleteButtonClicked={this.onDeleteButtonClicked}
          />
        </Dropdown>
        <img alt="" className="file-icon m-auto" src={this.itemIconSrc} />
        <div className="text-center mt-3">
          <div className="mb-1">
            {this.nameNode}
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    isDraggingAnItem: state.storage.isDraggingAnItem,
    currentFolderId: state.storage.currentFolderId,
    selectedItems: state.storage.selectedItems
  }))(FileGridItem);