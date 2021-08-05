import React, { MouseEvent, DragEvent, Fragment, ReactNode } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import { storageActions, storageSelectors, storageThunks } from '../../../../store/slices/storage';

import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import { AppDispatch, RootState } from '../../../../store';
import { connect } from 'react-redux';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData, FolderPath, UserSettings } from '../../../../models/interfaces';

import './FileGridItem.scss';
import { ItemAction, Workspace } from '../../../../models/enums';
import tasksService from '../../../../services/tasks.service';

import './FileGridItem.scss';
import iconService from '../../../../services/icon.service';
import { uiActions } from '../../../../store/slices/ui';
import { getItemFullName } from '../../../../services/storage.service/storage-name.service';
import { getAllItems } from '../../../../services/dragAndDrop.service';
interface FileGridItemProps {
  user: UserSettings;
  item: DriveItemData;
  selectedItems: DriveItemData[];
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveItemData | null;
  currentFolderId: number;
  namePath: FolderPath[];
  isItemSelected: (item: DriveItemData) => boolean;
  isDriveItemInfoMenuOpen: boolean;
  dispatch: AppDispatch;
  workspace: Workspace;
}

interface FileGridItemState {
  isEditingName: boolean;
  dirtyName: string;
  itemRef: React.RefObject<HTMLDivElement>;
  nameInputRef: React.RefObject<HTMLInputElement>;
  oldValueIsDriveItemInfoMenuOpen: boolean;
}

class FileGridItem extends React.Component<FileGridItemProps, FileGridItemState> {
  constructor(props: FileGridItemProps) {
    super(props);

    this.state = {
      isEditingName: false,
      dirtyName: '',
      itemRef: React.createRef(),
      nameInputRef: React.createRef(),
      oldValueIsDriveItemInfoMenuOpen: props.isDriveItemInfoMenuOpen
    };
  }

  componentDidMount() {
    this.updateHeight();

    window.addEventListener('resize', this.updateHeight);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateHeight);
  }

  updateHeight = () => {
    this.forceUpdate();
  }

  get nameNode(): JSX.Element {
    const { item } = this.props;
    const { isEditingName, dirtyName, nameInputRef } = this.state;
    const ṣpanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName ? 'flex' : 'hidden'}>
          <input
            className="w-full dense border border-white no-ring rect"
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
          className={`${ṣpanDisplayClass} file-grid-item-name-span`}
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
          fileService.updateMetaData(item.fileId, data as DriveFileMetadataPayload, isTeam).then(() => {
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

  onRenameButtonClicked = (): void => {
    const { item } = this.props;
    const { nameInputRef } = this.state;

    this.setState(
      { isEditingName: true, dirtyName: item.name },
      () => setTimeout(() => nameInputRef.current && nameInputRef.current.focus(), 0)
    );
  }

  onDownloadButtonClicked = (e: MouseEvent): void => {
    const { item, dispatch } = this.props;

    e.stopPropagation();

    tasksService.push(() => dispatch(storageThunks.downloadItemsThunk([item])));
  }

  onShareButtonClicked = (): void => {
    const { dispatch, item } = this.props;

    dispatch(storageActions.setItemToShare(item.id));
    dispatch(uiActions.setIsShareItemDialogOpen(true));
  }

  onInfoButtonClicked = (): void => {
    this.props.dispatch(storageActions.setInfoItem(this.props.item.id));
    this.props.dispatch(uiActions.setIsDriveItemInfoMenuOpen(true));
  }

  onDeleteButtonClicked = (): void => {
    const { dispatch, item } = this.props;

    dispatch(storageActions.setItemsToDelete([item]));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
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
  }

  onItemDoubleClicked = (): void => {
    const { dispatch, item } = this.props;

    if (item.isFolder) {
      dispatch(storageThunks.goToFolderThunk({ name: item.name, id: item.id }));
    }
  }

  onItemDragStart = (e: DragEvent<HTMLDivElement>): void => {
    // TODO: drag start handler
  }

  onItemDragEnd = (e: DragEvent<HTMLDivElement>): void => {
    // TODO: drag end handler
  }

  onItemDragOver = (e: DragEvent<HTMLDivElement>): void => {
    const { item, isDraggingAnItem, draggingTargetItemData } = this.props;

    if (item.isFolder) {
      e.preventDefault();
      e.stopPropagation();

      this.props.dispatch(storageActions.setDraggingItemTargetData(item));
    }
  }

  onItemDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    this.props.dispatch(storageActions.setDraggingItemTargetData(null));
  }

  onItemDrop = async (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    const { draggingTargetItemData, dispatch } = this.props;

    if (draggingTargetItemData && draggingTargetItemData.isFolder) {
      const namePathDestinationArray = this.props.namePath.map(level => level.name);

      namePathDestinationArray[0] = '';

      const itemsDragged = await getAllItems(e.dataTransfer);
      const { numberOfItems, rootList, files } = itemsDragged;

      let folderPath = namePathDestinationArray.join('/');

      folderPath = !draggingTargetItemData.isFolder ? folderPath : folderPath + '/' + draggingTargetItemData.name;
      const parentFolderId = draggingTargetItemData.isFolder ? draggingTargetItemData.id : this.props.currentFolderId;

      if (files) {
        // files where dragged directly
        await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId, folderPath }));
      }
      if (rootList) {
        for (const root of rootList) {
          const currentFolderId = parentFolderId;

          await dispatch(storageThunks.createFolderTreeStructureThunk({ root, currentFolderId }));
        }
      }
    }

    this.props.dispatch(storageActions.setDraggingItemTargetData(null));
  }

  render(): ReactNode {
    const { itemRef } = this.state;
    const { isDraggingAnItem, draggingTargetItemData, item, isItemSelected } = this.props;
    const isDraggingOverThisItem: boolean = !!draggingTargetItemData && draggingTargetItemData.id === item.id && draggingTargetItemData.isFolder === item.isFolder;
    const pointerEventsClassNames: string = (isDraggingAnItem || isDraggingOverThisItem) ?
      `pointer-events-none descendants ${item.isFolder ? 'only' : ''}` :
      'pointer-events-auto';
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
    const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
    const height = this.state.itemRef.current ?
      this.state.itemRef.current?.clientWidth + 'px' :
      'auto';

    return (
      <div
        ref={itemRef}
        style={{ height }}
        className={`${selectedClassNames} ${isDraggingOverThisItem ? 'drag-over-effect' : ''} ${pointerEventsClassNames} group file-grid-item`}
        onContextMenu={this.onItemRightClicked}
        onClick={this.onItemClicked}
        onDoubleClick={this.onItemDoubleClicked}
        draggable={true}
        onDragStart={this.onItemDragStart}
        onDragEnd={this.onItemDragEnd}
        onDragOver={this.onItemDragOver}
        onDragLeave={this.onItemDragLeave}
        onDrop={this.onItemDrop}
      >
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-grid-item-actions-button">
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
        <div className="file-grid-item-icon-container">
          <ItemIconComponent className="file-icon m-auto" />
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
    const currentFolderId = storageSelectors.currentFolderId(state);

    return {
      isDriveItemInfoMenuOpen: state.ui.isDriveItemInfoMenuOpen,
      isDraggingAnItem: state.storage.isDraggingAnItem,
      selectedItems: state.storage.selectedItems,
      draggingTargetItemData: state.storage.draggingTargetItemData,
      namePath: state.storage.namePath,
      currentFolderId,
      isItemSelected,
      workspace: state.team.workspace
    };
  })(FileGridItem);