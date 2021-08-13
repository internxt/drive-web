import React, { Component, ComponentClass, Fragment, ReactNode } from 'react';
import { ConnectDropTarget, DndComponentClass, DropTargetCollector, DropTargetSpec } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import { Workspace } from '../../../models/enums';
import { DriveFileMetadataPayload, DriveFolderMetadataPayload, DriveItemData, FolderPath, UserSettings } from '../../../models/interfaces';
import { getAllItems } from '../../../services/dragAndDrop.service';
import { getItemFullName } from '../../../services/storage.service/storage-name.service';
import { AppDispatch } from '../../../store';
import { storageActions, storageThunks } from '../../../store/slices/storage';
import { uiActions } from '../../../store/slices/ui';
import FileListItem from './FileListItem/FileListItem';

interface FileExplorerItemProps {
  user: UserSettings | undefined;
  item: DriveItemData;
  selectedItems: DriveItemData[];
  currentFolderId: number;
  namePath: FolderPath[];
  isItemSelected: (item: DriveItemData) => boolean;
  isSomeItemSelected: boolean;
  isSidenavCollapsed: boolean;
  isDriveItemInfoMenuOpen: boolean;
  dispatch: AppDispatch
  workspace: Workspace,
  isDraggingOverThisItem: boolean;
  connectDropTarget: ConnectDropTarget;
}

interface FileExplorerItemState {
  isEditingName: boolean;
  dirtyName: string;
  nameInputRef: React.RefObject<HTMLInputElement>;
}

export interface FileExplorerItemViewProps {
  dispatch: AppDispatch;
  namePath: FolderPath[];
  item: DriveItemData;
  isEditingName: boolean;
  dirtyName: string;
  nameInputRef: React.RefObject<HTMLInputElement>;
  isSidenavCollapsed: boolean;
  isDriveItemInfoMenuOpen: boolean;
  isDraggingOverThisItem: boolean;
  isSomeItemSelected: boolean;
  isItemSelected: (item: DriveItemData) => boolean;
  onItemRightClicked: (e: React.MouseEvent) => void;
  onItemClicked: (e: React.MouseEvent) => void;
  onItemDoubleClicked: (e: React.MouseEvent) => void;
  onRenameButtonClicked: (e: React.MouseEvent) => void;
  onDownloadButtonClicked: (e: React.MouseEvent) => void;
  onShareButtonClicked: (e: React.MouseEvent) => void;
  onInfoButtonClicked: (e: React.MouseEvent) => void;
  onDeleteButtonClicked: (e: React.MouseEvent) => void;
  onNameChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNameBlurred: () => void;
  onNameDoubleClicked: (e: React.MouseEvent) => void;
  onEnterKeyPressed: (e: React.KeyboardEvent) => void;
  dropTargetTypes: string | string[];
  connectDropTarget: ConnectDropTarget;
}

export interface DropTargetCollectorProps {
  isDraggingOverThisItem: boolean,
  connectDropTarget: ConnectDropTarget
}

export const dropTargetSpec: DropTargetSpec<FileExplorerItemViewProps> = {
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
  }
};

export const dropTargetCollect: DropTargetCollector<DropTargetCollectorProps, FileExplorerItemViewProps> = (connect, monitor, props) => {
  const isDraggingOverThisItem = monitor.isOver() && props.item.isFolder;

  return {
    isDraggingOverThisItem,
    connectDropTarget: connect.dropTarget()
  };
};

const fileExplorerItemWrapper =
  (ViewComponent: DndComponentClass<typeof FileListItem, DropTargetCollectorProps>): ComponentClass<FileExplorerItemProps, FileExplorerItemState> =>
    class extends Component<FileExplorerItemProps, FileExplorerItemState> {
      constructor(props: FileExplorerItemProps) {
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

      async confirmNameChange() {
        const { item, dispatch } = this.props;
        const { dirtyName, nameInputRef } = this.state;
        const metadata: DriveFileMetadataPayload | DriveFolderMetadataPayload = { metadata: { itemName: dirtyName } };

        if (item.name !== dirtyName) {
          await dispatch(storageThunks.updateItemMetadataThunk({ item, metadata }));
        }

        nameInputRef.current?.blur();
      }

      onNameDoubleClicked = (e: React.MouseEvent): void => {
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

      onItemRightClicked = (e: React.MouseEvent): void => {
        e.preventDefault();
      }

      onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { item, dispatch } = this.props;

        e.target.checked ?
          dispatch(storageActions.selectItems([item])) :
          dispatch(storageActions.deselectItems([item]));
      }

      onRenameButtonClicked = (e: React.MouseEvent): void => {
        const { item } = this.props;
        const { nameInputRef } = this.state;

        e.stopPropagation();

        this.setState(
          { isEditingName: true, dirtyName: item.name },
          () => setTimeout(() => nameInputRef.current?.focus(), 0)
        );
      }

      onDownloadButtonClicked = (e: React.MouseEvent): void => {
        const { item, dispatch } = this.props;

        e.stopPropagation();

        dispatch(storageThunks.downloadItemsThunk([item]));
      }

      onShareButtonClicked = (e: React.MouseEvent): void => {
        const { dispatch, item } = this.props;

        e.stopPropagation();

        dispatch(storageActions.setItemToShare(item));
        dispatch(uiActions.setIsShareItemDialogOpen(true));
      }

      onInfoButtonClicked = (e: React.MouseEvent): void => {
        e.stopPropagation();
        this.props.dispatch(storageActions.setInfoItem(this.props.item));
        this.props.dispatch(uiActions.setIsDriveItemInfoMenuOpen(true));
      }

      onDeleteButtonClicked = (e: React.MouseEvent): void => {
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

      get dropTargetTypes(): string | string[] {
        return this.props.item.isFolder ? [NativeTypes.FILE] : [];
      }

      render(): ReactNode {
        const viewProps: FileExplorerItemViewProps = {
          ...this.state,
          ...this.props,
          ...this
        };

        return (
          <ViewComponent {...viewProps} />
        );
      }
    };

export default fileExplorerItemWrapper;