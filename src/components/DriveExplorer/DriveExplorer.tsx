import { createRef, ReactNode, Component } from 'react';
import { connect } from 'react-redux';
import * as Unicons from '@iconscout/react-unicons';
import 'react-toastify/dist/ReactToastify.css';

import { DriveItemData, FolderPath, UserSettings } from '../../models/interfaces';
import { Workspace } from '../../models/enums';

import { storageActions, storageSelectors } from '../../store/slices/storage';
import { AppDispatch, RootState } from '../../store';

import { FileViewMode } from '../../models/enums';
import DriveExplorerList from './DriveExplorerList/DriveExplorerList';
import DriveExplorerGrid from './DriveExplorerGrid/DriveExplorerGrid';
import folderEmptyImage from '../../assets/images/folder-empty.svg';
import noResultsSearchImage from '../../assets/images/no-results-search.svg';
import { uiActions } from '../../store/slices/ui';

import deviceService from '../../services/device.service';
import CreateFolderDialog from '../dialogs/CreateFolderDialog/CreateFolderDialog';
import DriveExplorerOverlay from './DriveExplorerOverlay/DriveExplorerOverlay';

import { transformDraggedItems } from '../../services/drag-and-drop.service';
import DeleteItemsDialog from '../dialogs/DeleteItemsDialog/DeleteItemsDialog';
import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { StorageFilters } from '../../store/slices/storage/storage.model';
import storageThunks from '../../store/slices/storage/storage.thunks';
import { planSelectors } from '../../store/slices/plan';
import BaseButton from '../Buttons/BaseButton';

import './DriveExplorer.scss';

interface DriveExplorerProps {
  title: JSX.Element | string;
  titleClassName?: string;
  isLoading: boolean;
  items: DriveItemData[];
  onItemsDeleted?: () => void;
  onFileUploaded?: () => void;
  onFolderCreated?: () => void;
  onDragAndDropEnd?: () => void;
  user: UserSettings | undefined;
  currentFolderId: number;
  selectedItems: DriveItemData[];
  storageFilters: StorageFilters;
  isAuthenticated: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  dispatch: AppDispatch;
  workspace: Workspace;
  planLimit: number;
  planUsage: number;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
}

interface DriveExplorerState {
  fileInputRef: React.RefObject<HTMLInputElement>;
  fileInputKey: number; //! Changing this forces the invisible file input to render
  email: string;
  token: string;
  isAdmin: boolean;
  isMember: boolean;
}

class DriveExplorer extends Component<DriveExplorerProps, DriveExplorerState> {
  constructor(props: DriveExplorerProps) {
    super(props);

    this.state = {
      fileInputRef: createRef(),
      fileInputKey: Date.now(),
      email: '',
      token: '',
      isAdmin: true,
      isMember: false,
    };
  }

  get hasAnyItemSelected(): boolean {
    return this.props.selectedItems.length > 0;
  }

  get hasItems(): boolean {
    return this.props.items.length > 0;
  }

  get hasFilters(): boolean {
    return this.props.storageFilters.text.length > 0;
  }

  componentDidMount() {
    deviceService.redirectForMobile();
  }

  onUploadButtonClicked = (): void => {
    this.state.fileInputRef.current?.click();
  };

  onDownloadButtonClicked = (): void => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageThunks.downloadItemsThunk(selectedItems));
  };

  onUploadInputChanged = async (e) => {
    const { dispatch, onFileUploaded, currentFolderId, namePath } = this.props;

    dispatch(
      storageThunks.uploadItemsThunk({
        files: Array.from(e.target.files),
        parentFolderId: currentFolderId,
        folderPath: namePath.slice(1).reduce((t, path) => `${t}${path.name}/`, ''),
      }),
    ).then(() => onFileUploaded && onFileUploaded());

    this.setState({ fileInputKey: Date.now() });
  };

  onViewModeButtonClicked = (): void => {
    const viewMode: FileViewMode = this.props.viewMode === FileViewMode.List ? FileViewMode.Grid : FileViewMode.List;

    this.props.dispatch(storageActions.setViewMode(viewMode));
  };

  onCreateFolderButtonClicked = () => {
    this.props.dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  onBulkDeleteButtonClicked = () => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageActions.setItemsToDelete(selectedItems));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  };

  onPreviousPageButtonClicked = (): void => undefined;

  onNextPageButtonClicked = (): void => undefined;

  render(): ReactNode {
    const {
      isLoading,
      viewMode,
      title,
      titleClassName,
      items,
      isDeleteItemsDialogOpen,
      isCreateFolderDialogOpen,
      onItemsDeleted,
      onFolderCreated,
      isOver,
      connectDropTarget,
    } = this.props;
    const { fileInputRef, fileInputKey } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: <Unicons.UilTable />,
      [FileViewMode.Grid]: <Unicons.UilListUiAlt />,
    };
    const viewModes = {
      [FileViewMode.List]: DriveExplorerList,
      [FileViewMode.Grid]: DriveExplorerGrid,
    };
    const ViewModeComponent = viewModes[viewMode];

    return connectDropTarget(
      <div className="flex flex-col flex-grow h-full px-8" data-test="drag-and-drop-area">
        {isDeleteItemsDialogOpen && <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />}
        {isCreateFolderDialogOpen && <CreateFolderDialog onFolderCreated={onFolderCreated} />}

        <div className="flex flex-grow h-full max-w-full w-full">
          <div className="flex-grow flex flex-col w-1 pt-6">
            <div className="flex justify-between pb-4">
              <div className={`flex items-center text-lg ${titleClassName || ''}`}>{title}</div>

              <div className="flex">
                {this.hasAnyItemSelected ? (
                  <BaseButton className="primary mr-2 flex items-center" onClick={this.onDownloadButtonClicked}>
                    <Unicons.UilCloudDownload className="h-5 mr-1.5" />
                    <span>Download</span>
                  </BaseButton>
                ) : (
                  <BaseButton className="primary mr-1.5 flex items-center" onClick={this.onUploadButtonClicked}>
                    <Unicons.UilCloudUpload className="h-5 mr-1.5" />
                    <span>Upload</span>
                  </BaseButton>
                )}
                {!this.hasAnyItemSelected ? (
                  <BaseButton className="dark w-8 square mr-2" onClick={this.onCreateFolderButtonClicked}>
                    <Unicons.UilFolderPlus />
                  </BaseButton>
                ) : null}
                {this.hasAnyItemSelected ? (
                  <BaseButton className="dark w-8 square mr-2" onClick={this.onBulkDeleteButtonClicked}>
                    <Unicons.UilTrashAlt />
                  </BaseButton>
                ) : null}
                <BaseButton className="dark square w-8" onClick={this.onViewModeButtonClicked}>
                  {viewModesIcons[viewMode]}
                </BaseButton>
              </div>
            </div>

            <div className="h-full flex flex-col justify-between flex-grow overflow-y-hidden mb-5">
              <div className="flex flex-col justify-between flex-grow overflow-hidden">
                <ViewModeComponent items={items} isLoading={isLoading} />
              </div>

              {/* PAGINATION */}
              {/* !isLoading ? (
                <div className="pointer-events-none bg-white p-4 h-12 flex justify-center items-center rounded-b-4px">
                  <span className="text-sm w-1/3" />
                  <div className="flex justify-center w-1/3">
                    <button onClick={this.onPreviousPageButtonClicked} className="pagination-button">
                      <Unicons.UilAngleDoubleLeft />
                    </button>
                    <button className="pagination-button">1</button>
                    <button onClick={this.onNextPageButtonClicked} className="pagination-button">
                      <Unicons.UilAngleDoubleRight />
                    </button>
                  </div>
                  <div className="w-1/3"></div>
                </div>
              ) : null */}

              {
                /* EMPTY FOLDER */
                !this.hasFilters && !this.hasItems && !isLoading ? (
                  <DriveExplorerOverlay
                    icon={<img alt="" src={folderEmptyImage} className="w-full m-auto" />}
                    title="This folder is empty"
                    subtitle="Drag and drop here or click on upload button"
                  />
                ) : null
              }

              {
                /* NO SEARCH RESULTS */
                this.hasFilters && !this.hasItems && !isLoading ? (
                  <DriveExplorerOverlay
                    icon={<img alt="" src={noResultsSearchImage} className="w-full m-auto" />}
                    title="There are no results for this search"
                    subtitle="Drag and drop here or click on upload button"
                  />
                ) : null
              }

              {
                /* DRAG AND DROP */
                isOver ? (
                  <div className="drag-over-effect pointer-events-none absolute h-full w-full flex justify-center items-end"></div>
                ) : null
              }
            </div>

            <input
              key={fileInputKey}
              className="hidden"
              ref={fileInputRef}
              type="file"
              onChange={this.onUploadInputChanged}
              multiple={true}
            />
          </div>
        </div>
      </div>,
    );
  }
}

const dropTargetSpec: DropTargetSpec<DriveExplorerProps> = {
  drop: (props, monitor) => {
    const { dispatch, currentFolderId, onDragAndDropEnd } = props;
    const droppedData: { files: File[]; items: DataTransferItemList } = monitor.getItem();
    const isAlreadyDropped = monitor.didDrop();
    const namePathDestinationArray = props.namePath.map((level) => level.name);

    if (isAlreadyDropped) {
      return;
    }

    namePathDestinationArray[0] = '';

    const folderPath = namePathDestinationArray.join('/');

    transformDraggedItems(droppedData.items, folderPath).then(async ({ rootList, files }) => {
      if (files.length) {
        // files where dragged directly
        await dispatch(
          storageThunks.uploadItemsThunk({
            files,
            parentFolderId: currentFolderId,
            folderPath,
            options: {
              onSuccess: onDragAndDropEnd,
            },
          }),
        );
      }

      if (rootList.length) {
        for (const root of rootList) {
          await dispatch(
            storageThunks.createFolderTreeStructureThunk({
              root,
              currentFolderId,
              options: {
                onSuccess: onDragAndDropEnd,
              },
            }),
          );
        }
      }
    });
  },
};

const dropTargetCollect: DropTargetCollector<
  { isOver: boolean; connectDropTarget: ConnectDropTarget },
  DriveExplorerProps
> = (connect, monitor) => {
  const isOver = monitor.isOver({ shallow: true });

  return {
    isOver,
    connectDropTarget: connect.dropTarget(),
  };
};

export default connect((state: RootState) => {
  const currentFolderId: number = storageSelectors.currentFolderId(state);

  return {
    isAuthenticated: state.user.isAuthenticated,
    user: state.user.user,
    currentFolderId,
    selectedItems: state.storage.selectedItems,
    storageFilters: state.storage.filters,
    isCreateFolderDialogOpen: state.ui.isCreateFolderDialogOpen,
    isDeleteItemsDialogOpen: state.ui.isDeleteItemsDialogOpen,
    viewMode: state.storage.viewMode,
    namePath: state.storage.namePath,
    workspace: state.session.workspace,
    planLimit: planSelectors.planLimitToShow(state),
    planUsage: state.plan.planUsage,
  };
})(DropTarget([NativeTypes.FILE], dropTargetSpec, dropTargetCollect)(DriveExplorer));
