import React, { Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';
import { Dropdown } from 'react-bootstrap';

import FileDropdownActions from '../../FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import './FileListItem.scss';
import dateService from '../../../../services/date.service';
import { AppDispatch, RootState } from '../../../../store';
import { storageActions, storageSelectors, storageThunks } from '../../../../store/slices/storage';
import downloadService from '../../../../services/download.service';
import { DriveFileData, DriveFileMetadataPayload, DriveFolderData, DriveFolderMetadataPayload, UserSettings } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import iconService from '../../../../services/icon.service';
import { setIsDeleteItemsDialogOpen } from '../../../../store/slices/ui';
import { ItemAction } from '../../../../models/enums';

interface FileListItemProps {
  user: UserSettings | undefined;
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveFileData | DriveFolderData;
  item: DriveFileData | DriveFolderData;
  selectedItems: (DriveFileData | DriveFolderData)[];
  currentFolderId: number;
  isItemSelected: (item: DriveFileData | DriveFolderData) => boolean;
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
        <input className={`${isEditingName ? 'block' : 'hidden'} dense`} ref={nameInputRef} type="text" value={dirtyName} placeholder="Change name folder" onChange={this.onNameChanged} onBlur={this.onNameBlurred} onKeyPress={this.onEnterKeyPressed} autoFocus />
        <span
          className={`${spanDisplayClass} w-min whitespace-nowrap overflow-hidden overflow-ellipsis text-neutral-900 text-sm px-1`}
          onDoubleClick={this.onNameDoubleClicked}
        >{item.name}</span>
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

    return (
      <tr
        className={`${isDraggingOverThisItem ? 'drag-over-effect' : ''} ${pointerEventsClassNames} group file-list-item`}
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
          <img alt="" className="type-icon" src={this.itemIconSrc} />
        </td>
        <td>
          <div>
            <div className="mb-1">
              {this.nameNode}
            </div>
          </div>
        </td>
        <td>{dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}</td>
        <td>{sizeService.bytesToString(item.size, false).toUpperCase()}</td>
        <td>
          <div className="flex justify-center">
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
        <td>
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button text-blue-60 bg-l-neutral-20 font-bold rounded-2xl">
              <img alt="" src={iconService.getIcon('actions')} />
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
      currentFolderId,
      isItemSelected
    };
  })(FileListItem);