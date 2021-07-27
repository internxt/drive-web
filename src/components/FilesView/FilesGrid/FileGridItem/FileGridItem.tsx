import React, { DragEvent, Fragment, ReactNode } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import FileDropdownActions from '../../FileDropdownActions/FileDropdownActions';
import iconService, { IconType } from '../../../../services/icon.service';
import { storageActions, storageSelectors, storageThunks } from '../../../../store/slices/storage';

import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import { AppDispatch, RootState } from '../../../../store';
import { connect } from 'react-redux';
import { DriveFileData, DriveFolderData, UserSettings } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import { setIsDeleteItemsDialogOpen } from '../../../../store/slices/ui';

import './FileGridItem.scss';
import { ItemAction } from '../../../../models/enums';

interface FileGridItemProps {
  user: UserSettings;
  item: DriveFileData | DriveFolderData;
  selectedItems: (DriveFileData | DriveFolderData)[];
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveFileData | DriveFolderData | null;
  currentFolderId: number | null;
  isItemSelected: (item: DriveFileData | DriveFolderData) => boolean;
  dispatch: AppDispatch;
}

interface FileGridItemState {
  isEditingName: boolean;
  dirtyName: string;
  itemRef: React.RefObject<HTMLDivElement>;
  nameInputRef: React.RefObject<HTMLInputElement>;
  height: string;
}

class FileGridItem extends React.Component<FileGridItemProps, FileGridItemState> {
  constructor(props: FileGridItemProps) {
    super(props);

    this.state = {
      isEditingName: false,
      dirtyName: '',
      itemRef: React.createRef(),
      nameInputRef: React.createRef(),
      height: 'auto'
    };
  }

  componentDidMount() {
    this.updateItemHeight();

    window.addEventListener('resize', () => this.updateItemHeight());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () => this.updateItemHeight());
  }

  updateItemHeight = () => {
    this.setState({ height: this.state.itemRef.current?.clientWidth + 'px' });
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

  onItemClicked = (): void => {
    const { item, dispatch, isItemSelected } = this.props;

    if (!item.isFolder) {
      isItemSelected(item) ?
        dispatch(storageActions.deselectItem(item)) :
        dispatch(storageActions.selectItem(item));
    }
  }

  onItemDoubleClicked = (): void => {
    const { dispatch, item } = this.props;

    dispatch(storageThunks.goToFolderThunk(item.id));
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
    const { itemRef, height } = this.state;
    const { isDraggingAnItem, draggingTargetItemData, item, isItemSelected } = this.props;
    const isDraggingOverThisItem: boolean = !!draggingTargetItemData && draggingTargetItemData.id === item.id && draggingTargetItemData.isFolder === item.isFolder;
    const pointerEventsClassNames: string = (isDraggingAnItem || isDraggingOverThisItem) ?
      `pointer-events-none descendants ${item.isFolder ? 'only' : ''}` :
      'pointer-events-auto';
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';

    return (
      <div
        ref={itemRef}
        style={{ height }}
        className={`${selectedClassNames} ${isDraggingOverThisItem ? 'drag-over-effect' : ''} ${pointerEventsClassNames} group file-grid-item`}
        onClick={this.onItemClicked}
        onDoubleClick={this.onItemDoubleClicked}
        onDragOver={this.onItemDragOver}
        onDragLeave={this.onItemDragLeave}
        onDrop={this.onItemDrop}
      >
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-grid-item-actions-button">
            <img alt="" className="m-auto" src={iconService.getIcon(IconType.Actions)} />
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
        <div className="file-grid-item-icon-container">
          <img alt="" className="file-icon m-auto" src={this.itemIconSrc} />
        </div>
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
  (state: RootState) => {
    const isItemSelected = storageSelectors.isItemSelected(state);

    return {
      isDraggingAnItem: state.storage.isDraggingAnItem,
      selectedItems: state.storage.selectedItems,
      draggingTargetItemData: state.storage.draggingTargetItemData,
      currentFolderId: state.storage.currentFolderId,
      isItemSelected
    };
  })(FileGridItem);