import React, { MouseEvent, Fragment, ReactNode } from 'react';
import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';
import { connect } from 'react-redux';
import { Dropdown } from 'react-bootstrap';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import './FileListItem.scss';
import dateService from '../../../../services/date.service';
import { AppDispatch, RootState } from '../../../../store';
import { storageActions, storageSelectors, storageThunks } from '../../../../store/slices/storage';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData, FolderPath, UserSettings } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import fileService from '../../../../services/file.service';
import iconService from '../../../../services/icon.service';
import { ItemAction, Workspace } from '../../../../models/enums';
import { uiActions } from '../../../../store/slices/ui';
import { getItemFullName } from '../../../../services/storage.service/storage-name.service';
import { getAllItems } from '../../../../services/dragAndDrop.service';
import { NativeTypes } from 'react-dnd-html5-backend';

interface FileListItemProps {
  user: UserSettings | undefined;
  item: DriveItemData;
  selectedItems: DriveItemData[];
  currentFolderId: number;
  namePath: FolderPath[];
  isItemSelected: (item: DriveItemData) => boolean;
  isSomeItemSelected: boolean;
  dispatch: AppDispatch
  workspace: Workspace,
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
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
            className="dense border border-white no-ring rect"
            onClick={(e) => e.stopPropagation()}
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
      const oldName = item.name;

      if (item.name !== dirtyName) {
        this.props.dispatch(storageActions.resetItemName({ name: dirtyName, id: item.id, isFolder: !!item.isFolder }));
        if (item.isFolder) {
          folderService.updateMetaData(item.id, data, isTeam)
            .then((res) => {
              if (!res) {
                this.props.dispatch(storageActions.resetItemName({ name: oldName, id: item.id, isFolder: !!item.isFolder }));
              }
              // this.props.dispatch(storageActions.resetItemName({ name: dirtyName, id: item.id, isFolder: item.isFolder }));
              /*
              this.props.dispatch(
                storageThunks.fetchFolderContentThunk()
              );*/
            });
        } else {
          fileService.updateMetaData(item.fileId, data, isTeam).then((res) => {
            if (!res) {
              this.props.dispatch(storageActions.resetItemName({ name: oldName, id: item.id, isFolder: !!item.isFolder }));
            }
            /*
            this.props.dispatch(
              storageThunks.fetchFolderContentThunk()
            );*/
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
    const { item, dispatch } = this.props;

    e.stopPropagation();

    dispatch(storageThunks.downloadItemsThunk([item]));
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

  render(): ReactNode {
    const { item, isItemSelected, isSomeItemSelected, isOver, connectDropTarget } = this.props;
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
    const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

    return connectDropTarget(
      <div
        className={`${selectedClassNames} ${isOver ? 'drag-over-effect' : ''} group file-list-item`}
        draggable={false}
        onContextMenu={this.onItemRightClicked}
        onClick={this.onItemClicked}
        onDoubleClick={this.onItemDoubleClicked}
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
          <div className={`${isSomeItemSelected ? 'invisible' : ''} flex`}>
            {!item.isFolder ?
              <button onClick={this.onDownloadButtonClicked} className="hover-action mr-4">
                <Unicons.UilCloudDownload className="h-5" />
              </button> : null
            }
            {!item.isFolder ?
              <button onClick={this.onShareButtonClicked} className="hover-action mr-4">
                <Unicons.UilShareAlt className="h-5" />
              </button> : null
            }
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
                hiddenActions={item.isFolder ? [ItemAction.Download, ItemAction.Share] : []}
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

const dropTargetSpec: DropTargetSpec<FileListItemProps> = {
  drop: (props, monitor, component) => {
    const { dispatch, namePath, item } = props;
    const droppedData = monitor.getItem();

    if (item.isFolder) {
      const namePathDestinationArray = namePath.map(level => level.name);

      namePathDestinationArray[0] = '';

      let folderPath = namePathDestinationArray.join('/');

      folderPath = folderPath + '/' + item.name;

      getAllItems(droppedData, folderPath).then(async ({ rootList, files }) => {
        if (files) { // Only files
          await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: item.id, folderPath }));
        }
        if (rootList) { // Directory tree
          for (const root of rootList) {
            const currentFolderId = item.id;

            await dispatch(storageThunks.createFolderTreeStructureThunk({ root, currentFolderId }));
          }
        }
      });
    }
  },
  hover: (props, monitor, component) => { }
};

const dropTargetCollect: DropTargetCollector<{ isOver: boolean, connectDropTarget: ConnectDropTarget }, FileListItemProps> = (connect, monitor, props) => {
  const isOver = monitor.isOver() && props.item.isFolder;

  return {
    isOver,
    connectDropTarget: connect.dropTarget()
  };
};

export default connect(
  (state: RootState) => {
    const isItemSelected = storageSelectors.isItemSelected(state);
    const currentFolderId = storageSelectors.currentFolderId(state);
    const isSomeItemSelected = storageSelectors.isSomeItemSelected(state);

    return {
      selectedItems: state.storage.selectedItems,
      namePath: state.storage.namePath,
      currentFolderId,
      isItemSelected,
      isSomeItemSelected,
      workspace: state.team.workspace
    };
  })(DropTarget((props) => props.item.isFolder ? [NativeTypes.FILE] : [], dropTargetSpec, dropTargetCollect)(FileListItem));