import React, { MouseEvent, Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';
import { Dropdown } from 'react-bootstrap';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import './FileListItem.scss';
import dateService from '../../../../services/date.service';
import { AppDispatch, RootState } from '../../../../store';
import { storageActions, storageSelectors, storageThunks } from '../../../../store/slices/storage';
import downloadService from '../../../../services/download.service';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData, FolderPath, UserSettings } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import iconService from '../../../../services/icon.service';
import { FileActionTypes, FileStatusTypes, ItemAction, Workspace } from '../../../../models/enums';
import queueFileLogger from '../../../../services/queueFileLogger';
import { uiActions } from '../../../../store/slices/ui';
import { updateFileStatusLogger } from '../../../../store/slices/files';
import { getItemFullName } from '../../../../services/storage.service/storage-name.service';

interface FileListItemProps {
  user: UserSettings | undefined;
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveItemData | null;
  item: DriveItemData;
  selectedItems: DriveItemData[];
  currentFolderId: number;
  namePath: FolderPath[];
  isItemSelected: (item: DriveItemData) => boolean;
  dispatch: AppDispatch
  workspace: Workspace
}

interface FileListItemState {
  isEditingName: boolean;
  showContextMenu: boolean;
  dirtyName: string;
  nameInputRef: React.RefObject<HTMLInputElement>;
}

class FileListItem extends React.Component<FileListItemProps, FileListItemState> {
  constructor(props: FileListItemProps) {
    super(props);

    this.state = {
      isEditingName: false,
      showContextMenu: false,
      dirtyName: '',
      nameInputRef: React.createRef()
    };
  }

  get nameNode(): JSX.Element {
    const { item } = this.props;
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const spanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName ? 'block' : 'hidden'}>
          <input
            className="dense border border-white no-ring rect"
            ref={nameInputRef}
            type="text"
            value={dirtyName}
            placeholder="Name"
            onChange={this.onNameChanged}
            onBlur={this.onNameBlurred}
            onKeyPress={this.onEnterKeyPressed}
            autoFocus
          />
          <span className="ml-1">{item.type ? ('.' + item.type) : ''}</span>
        </div>
        <span
          className={`${spanDisplayClass} file-list-item-name-span`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={this.onNameDoubleClicked}
        >{getItemFullName(item.name, item.type)}</span>
      </Fragment>
    );
  }

  confirmNameChange() {
    const { item } = this.props;
    const { dirtyName, nameInputRef } = this.state;
    const data: DriveFileMetadataPayload | DriveFolderMetadataPayload = { metadata: { itemName: dirtyName } };
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    try {
      if (item.name !== dirtyName) {
        if (item.isFolder) {
          folderService.updateMetaData(item.id, data, isTeam)
            .then(() => {
              this.props.dispatch(
                storageThunks.fetchFolderContentThunk()
              );
            });
        } else {
          fileService.updateMetaData(item.fileId, data, isTeam).then(() => {
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

  onNameChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ dirtyName: e.target.value });
  }

  onEnterKeyPressed = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.confirmNameChange();
    }
  }

  onItemClicked = (): void => {
    const { item, dispatch, isItemSelected } = this.props;

    if (!item.isFolder) {
      isItemSelected(item) ?
        dispatch(storageActions.deselectItems([item])) :
        dispatch(storageActions.selectItems([item]));
    }
  }

  onItemRightClicked = (e: MouseEvent): void => {
    e.preventDefault();

    document.removeEventListener('click', this.onOutsideContextMenuClicked);
    document.addEventListener('click', this.onOutsideContextMenuClicked);

    this.setState({ showContextMenu: true });
  }

  onOutsideContextMenuClicked = (): void => {
    document.removeEventListener('click', this.onOutsideContextMenuClicked);
    this.setState({ showContextMenu: false });
  }

  onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { item, dispatch } = this.props;

    e.target.checked ?
      dispatch(storageActions.selectItems([item])) :
      dispatch(storageActions.deselectItems([item]));
  }

  onRenameButtonClicked = (e: MouseEvent): void => {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    e.stopPropagation();

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => setTimeout(() => nameInputRef.current?.focus(), 0)
    );
  }

  onDownloadButtonClicked = (e: MouseEvent): void => {
    const { item, namePath } = this.props;
    const relativePath = namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');
    const path = relativePath + '/' + item.name;

    e.stopPropagation();
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    const isFolder = item.fileId ? false : true;

    this.props.dispatch(updateFileStatusLogger({ action: FileActionTypes.Download, status: FileStatusTypes.Pending, filePath: path, type: item.type, isFolder }));
    queueFileLogger.push(() => downloadService.downloadFile(item, path, this.props.dispatch, isTeam));
  }

  onShareButtonClicked = (e: MouseEvent): void => {
    const { dispatch, item } = this.props;

    e.stopPropagation();

    dispatch(storageActions.setItemToShare(item.id));
    dispatch(uiActions.setIsShareItemDialogOpen(true));
  }

  onInfoButtonClicked = (e: MouseEvent): void => {
    e.stopPropagation();
    this.props.dispatch(storageActions.setInfoItem(this.props.item.id));
    this.props.dispatch(uiActions.setIsDriveItemInfoMenuOpen(true));
  }

  onDeleteButtonClicked = (e: MouseEvent): void => {
    const { dispatch, item } = this.props;

    e.stopPropagation();

    dispatch(storageActions.setItemsToDelete([item]));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  }

  onItemDoubleClicked = (): void => {
    const { dispatch, item } = this.props;

    if (item.isFolder) {
      dispatch(storageThunks.goToFolderThunk({ name: item.name, id: item.id }));
    }
  }

  onItemDragOver = (e: React.DragEvent<HTMLTableRowElement>): void => {
    const { item, isDraggingAnItem, draggingTargetItemData } = this.props;

    if (item.isFolder) {
      e.preventDefault();
      e.stopPropagation();

      this.props.dispatch(storageActions.setDraggingItemTargetData(item));
    }
  }

  onItemDragLeave = (e: React.DragEvent<HTMLTableRowElement>): void => {
    this.props.dispatch(storageActions.setDraggingItemTargetData(null));
  }

  onItemDrop = (e: React.DragEvent<HTMLTableRowElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    console.log('onItemDrop!');

    this.props.dispatch(storageActions.setDraggingItemTargetData(null));
  }

  render(): ReactNode {
    const { isDraggingAnItem, draggingTargetItemData, item, isItemSelected } = this.props;
    const isDraggingOverThisItem: boolean = !!draggingTargetItemData && draggingTargetItemData.id === item.id && draggingTargetItemData.isFolder === item.isFolder;
    const pointerEventsClassNames: string = (isDraggingAnItem || isDraggingOverThisItem) ?
      `pointer-events-none descendants ${item.isFolder ? 'only' : ''}` :
      'pointer-events-auto';
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
    const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

    return (
      <div
        className={`${selectedClassNames} ${isDraggingOverThisItem ? 'drag-over-effect' : ''} ${pointerEventsClassNames} group file-list-item`}
        onContextMenu={this.onItemRightClicked}
        onClick={this.onItemClicked}
        onDoubleClick={this.onItemDoubleClicked}
        onDragOver={this.onItemDragOver}
        onDragLeave={this.onItemDragLeave}
        onDrop={this.onItemDrop}
      >

        {/* SELECTION */}
        <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
          {!item.isFolder ?
            <input
              onClick={(e) => e.stopPropagation()}
              type="checkbox"
              checked={isItemSelected(item)}
              onChange={this.onSelectCheckboxChanged}
            /> :
            null
          }
        </div>

        {/* ICON */}
        <div className="w-0.5/12 flex items-center px-3 box-content">
          <div className="h-8 w-8 flex justify-center">
            <ItemIconComponent className="h-full" />
          </div>
        </div>

        {/* NAME */}
        <div className="flex-grow flex items-center w-1">
          {this.nameNode}
        </div>

        {/* HOVER ACTIONS */}
        <div className="pl-3 w-2/12 items-center hidden xl:flex">
          <div className="flex">
            {!item.isFolder ?
              <button onClick={this.onDownloadButtonClicked} className="hover-action mr-4">
                <Unicons.UilCloudDownload className="h-5" />
              </button> : null
            }
            <button onClick={this.onShareButtonClicked} className="hover-action mr-4">
              <Unicons.UilShareAlt className="h-5" />
            </button>
            <button onClick={this.onDeleteButtonClicked} className="hover-action">
              <Unicons.UilTrashAlt className="h-5" />
            </button>
          </div>
        </div>

        {/* DATE */}
        <div className="hidden lg:flex items-center w-3/12 whitespace-nowrap overflow-ellipsis">{dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}</div>

        {/* SIZE */}
        <div className="flex items-center w-2/12 whitespace-nowrap overflow-ellipsis">{sizeService.bytesToString(item.size, false).toUpperCase()}</div>

        {/* ACTIONS BUTTON */}
        <div className="flex items-center w-1/12">
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button text-blue-60 bg-l-neutral-20 font-bold">
              <Unicons.UilEllipsisH className="w-full h-full" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <FileDropdownActions
                hiddenActions={item.isFolder ? [ItemAction.Download] : []}
                onRenameButtonClicked={this.onRenameButtonClicked}
                onDownloadButtonClicked={this.onDownloadButtonClicked}
                onShareButtonClicked={this.onShareButtonClicked}
                onInfoButtonClicked={this.onInfoButtonClicked}
                onDeleteButtonClicked={this.onDeleteButtonClicked}
              />
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => {
    const isItemSelected = storageSelectors.isItemSelected(state);
    const currentFolderId = storageSelectors.currentFolderId(state);

    return {
      isDraggingAnItem: state.storage.isDraggingAnItem,
      selectedItems: state.storage.selectedItems,
      draggingTargetItemData: state.storage.draggingTargetItemData,
      namePath: state.storage.namePath,
      currentFolderId,
      isItemSelected,
      workspace: state.team.workspace
    };
  })(FileListItem);