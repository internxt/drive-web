import React, { Fragment, ReactNode } from 'react';
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
import { setIsDeleteItemsDialogOpen } from '../../../../store/slices/ui';
import { ItemAction } from '../../../../models/enums';
import queueFileLogger from '../../../../services/queueFileLogger';
import { updateFileStatusLogger } from '../../../../store/slices/files';

interface FileListItemProps {
  user: UserSettings | undefined;
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveItemData;
  item: DriveItemData;
  selectedItems: DriveItemData[];
  currentFolderId: number;
  namePath: FolderPath[];
  isItemSelected: (item: DriveItemData) => boolean;
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
  }

  get nameNode(): JSX.Element {
    const { item } = this.props;
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const spanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName ? 'block' : 'hidden'}>
          <input
            className="dense border border-white`"
            ref={nameInputRef}
            type="text"
            value={dirtyName}
            placeholder="Name"
            onChange={this.onNameChanged}
            onBlur={this.onNameBlurred} onKeyPress={this.onEnterKeyPressed}
            autoFocus
          />
          <span className="ml-1">{!item.isFolder ? ('.' + item.type) : ''}</span>
        </div>
        <span
          className={`${spanDisplayClass} file-list-item-name-span`}
          onDoubleClick={this.onNameDoubleClicked}
        >{`${item.name}${!item.isFolder ? ('.' + item.type) : ''}`}</span>
      </Fragment>
    );
  }

  get itemIconSrc(): string {
    return this.props.item.isFolder ?
      iconService.getIcon('folderBlue') :
      iconService.getIcon('defaultFile');
  }

  confirmNameChange() {
    const { item } = this.props;
    const { dirtyName, nameInputRef } = this.state;
    const data: DriveFileMetadataPayload | DriveFolderMetadataPayload = { metadata: { itemName: dirtyName } };

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
        dispatch(storageActions.deselectItem(item)) :
        dispatch(storageActions.selectItem(item));
    }
  }

  onItemRightClicked = (e: MouseEvent): void => {
    e.preventDefault();
    alert('onItemRightClicked');
  }

  onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { item, dispatch } = this.props;

    e.target.checked ?
      dispatch(storageActions.selectItem(item)) :
      dispatch(storageActions.deselectItem(item));
  }

  onRenameButtonClicked = (): void => {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => setTimeout(() => nameInputRef.current?.focus(), 0)
    );
  }

  onDownloadButtonClicked = (): void => {
    const relativePath = this.props.namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');
    const path = relativePath + '/' + this.props.item.name + '.' + this.props.item.type;

    this.props.dispatch(updateFileStatusLogger({ action: 'download', status: 'pending', filePath: path, isFolder: false }));
    queueFileLogger.push(() => downloadService.downloadFile(this.props.item, path, this.props.dispatch));
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

    dispatch(storageActions.setItemsToDelete([item]));
    dispatch(setIsDeleteItemsDialogOpen(true));
  }

  onItemDoubleClicked = (): void => {
    const { dispatch, item } = this.props;

    if (item.isFolder) {
      dispatch(storageThunks.goToFolderThunk({ name: item.name, id: item.id }));
    }
  }

  onItemDragOver = (e: DragEvent<HTMLDivElement>): void => {
    const { item } = this.props;

    if (item.isFolder) {
      e.preventDefault();
      e.stopPropagation();

      this.props.dispatch(storageActions.setDraggingItemTargetData(this.props.item));
    }
  }

  onItemDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    this.props.dispatch(storageActions.setDraggingItemTargetData(null));
  }

  onItemDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    console.log('onItemDrop!');

    this.props.dispatch(storageActions.setDraggingItemTargetData(null));
  }

  render(): ReactNode {
    const { isDraggingAnItem, draggingTargetItemData, item, isItemSelected } = this.props;
    const isDraggingOverThisItem: boolean = draggingTargetItemData && draggingTargetItemData.id === item.id && draggingTargetItemData.isFolder === item.isFolder;
    const pointerEventsClassNames: string = (isDraggingAnItem || isDraggingOverThisItem) ?
      `pointer-events-none descendants ${item.isFolder ? 'only' : ''}` :
      'pointer-events-auto';
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';

    return (
      <tr
        className={`${selectedClassNames} ${isDraggingOverThisItem ? 'drag-over-effect' : ''} ${pointerEventsClassNames} group file-list-item`}
        onContextMenu={this.onItemRightClicked}
        onClick={this.onItemClicked}
        onDoubleClick={this.onItemDoubleClicked}
        onDragOver={this.onItemDragOver}
        onDragLeave={this.onItemDragLeave}
        onDrop={this.onItemDrop}
      >
        <td className="px-4">
          {!item.isFolder ?
            <input type="checkbox" checked={isItemSelected(item)} onChange={this.onSelectCheckboxChanged} /> :
            null
          }
        </td>
        <td>
          <div className="h-8 w-8 flex justify-center">
            <img alt="" src={this.itemIconSrc} />
          </div>
        </td>
        <td>
          <div>
            <div className="mb-1">
              {this.nameNode}
            </div>
          </div>
        </td>
        <td>
          <div className="flex">
            {!item.isFolder ?
              <button onClick={this.onDownloadButtonClicked} className="hover-action mr-4">
                <img alt="" src={iconService.getIcon('downloadItems')} />
              </button> : null
            }
            <button onClick={this.onShareButtonClicked} className="hover-action mr-4">
              <img alt="" src={iconService.getIcon('shareItems')} />
            </button>
            <button onClick={this.onDeleteButtonClicked} className="hover-action">
              <img alt="" src={iconService.getIcon('deleteItems')} />
            </button>
          </div>
        </td>
        <td>{dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}</td>
        <td>{sizeService.bytesToString(item.size, false).toUpperCase()}</td>
        <td>
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button text-blue-60 bg-l-neutral-20 font-bold">
              <Unicons.UilEllipsisH className="w-full h-full" />
            </Dropdown.Toggle>
            <FileDropdownActions
              hiddenActions={item.isFolder ? [ItemAction.Download] : []}
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
  (state: RootState) => {
    const isItemSelected = storageSelectors.isItemSelected(state);
    const currentFolderId = storageSelectors.currentFolderId(state);

    return {
      isDraggingAnItem: state.storage.isDraggingAnItem,
      selectedItems: state.storage.selectedItems,
      draggingTargetItemData: state.storage.draggingTargetItemData,
      namePath: state.storage.namePath,
      currentFolderId,
      isItemSelected
    };
  })(FileListItem);