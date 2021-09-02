import { createRef, ReactNode, Component } from 'react';
import { connect } from 'react-redux';
import * as Unicons from '@iconscout/react-unicons';
import 'react-toastify/dist/ReactToastify.css';

import { DriveItemData, FolderPath, UserSettings } from '../../models/interfaces';
import { Workspace } from '../../models/enums';

import { storageActions, storageSelectors } from '../../store/slices/storage';
import { AppDispatch, RootState } from '../../store';

import DriveItemInfoMenu from '../DriveItemInfoMenu/DriveItemInfoMenu';
import { FileViewMode } from '../../models/enums';
import FilesList from './FilesList/FilesList';
import FilesGrid from './FilesGrid/FilesGrid';
import folderEmptyImage from '../../assets/images/folder-empty.png';
import noResultsSearchImage from '../../assets/images/no-results-search.png';
import { uiActions } from '../../store/slices/ui';

import './FileExplorer.scss';
import deviceService from '../../services/device.service';
import CreateFolderDialog from '../dialogs/CreateFolderDialog/CreateFolderDialog';
import FileExplorerOverlay from './FileExplorerOverlay/FileExplorerOverlay';

import { transformDraggedItems } from '../../services/drag-and-drop.service';
import DeleteItemsDialog from '../dialogs/DeleteItemsDialog/DeleteItemsDialog';
import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { StorageFilters } from '../../store/slices/storage/storage.model';
import storageThunks from '../../store/slices/storage/storage.thunks';
import { planSelectors, planThunks } from '../../store/slices/plan';

import './FileExplorer.scss';

interface FileExplorerProps {
  title: JSX.Element | string;
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
  infoItem: DriveItemData | null;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  dispatch: AppDispatch;
  workspace: Workspace;
  planLimit: number;
  planUsage: number;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
}

interface FileExplorerState {
  fileInputRef: React.RefObject<HTMLInputElement>;
  email: string;
  token: string;
  isAdmin: boolean;
  isMember: boolean;
}

class FileExplorer extends Component<FileExplorerProps, FileExplorerState> {
  constructor(props: FileExplorerProps) {
    super(props);

    this.state = {
      fileInputRef: createRef(),
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
    const { dispatch, planLimit } = this.props;

    try {
      const planUsage: number = await dispatch(planThunks.fetchUsageThunk()).unwrap();

      if (planLimit && planUsage >= planLimit) {
        this.props.dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
      } else {
        this.dispatchUpload(e);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  dispatchUpload = (e) => {
    const { dispatch, onFileUploaded, currentFolderId, namePath } = this.props;

    dispatch(
      storageThunks.uploadItemsThunk({
        files: Array.from(e.target.files),
        parentFolderId: currentFolderId,
        folderPath: namePath.slice(1).reduce((t, path) => `${t}${path.name}/`, ''),
      }),
    ).then(() => onFileUploaded && onFileUploaded());
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
      infoItem,
      viewMode,
      title,
      items,
      isDeleteItemsDialogOpen,
      isCreateFolderDialogOpen,
      onItemsDeleted,
      onFolderCreated,
      isOver,
      connectDropTarget,
    } = this.props;
    const { fileInputRef } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: <Unicons.UilGrid />,
      [FileViewMode.Grid]: <Unicons.UilListUiAlt />,
    };
    const viewModes = {
      [FileViewMode.List]: FilesList,
      [FileViewMode.Grid]: FilesGrid,
    };
    const ViewModeComponent = viewModes[viewMode];

    return connectDropTarget(
      <div className="flex flex-column flex-grow h-1" data-test="drag-and-drop-area">
        {isDeleteItemsDialogOpen && <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />}
        {isCreateFolderDialogOpen && <CreateFolderDialog onFolderCreated={onFolderCreated} />}

        <div className="flex flex-grow h-full max-w-full w-full">
          <div className="flex-grow flex flex-col w-1">
            <div className="flex justify-between pb-4">
              <div className="text-lg">{title}</div>

              <div className="flex">
                {this.hasAnyItemSelected ? (
                  <button className="primary mr-2 flex items-center" onClick={this.onDownloadButtonClicked}>
                    <Unicons.UilCloudDownload className="h-5 mr-1.5" />
                    <span>Download</span>
                  </button>
                ) : (
                  <button className="primary mr-1.5 flex items-center" onClick={this.onUploadButtonClicked}>
                    <Unicons.UilCloudUpload className="h-5 mr-1.5" />
                    <span>Upload</span>
                  </button>
                )}
                {!this.hasAnyItemSelected ? (
                  <button className="w-8 secondary square mr-2" onClick={this.onCreateFolderButtonClicked}>
                    <Unicons.UilFolderPlus />
                  </button>
                ) : null}
                {this.hasAnyItemSelected ? (
                  <button className="w-8 secondary square mr-2" onClick={this.onBulkDeleteButtonClicked}>
                    <Unicons.UilTrashAlt />
                  </button>
                ) : null}
                <button className="secondary square w-8" onClick={this.onViewModeButtonClicked}>
                  {viewModesIcons[viewMode]}
                </button>
              </div>
            </div>

            <div className="relative h-full flex flex-col justify-between flex-grow overflow-y-hidden">
              <div className="flex flex-col justify-between flex-grow overflow-y-auto overflow-x-hidden">
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
                  <FileExplorerOverlay
                    icon={<img alt="" src={folderEmptyImage} className="w-full m-auto" />}
                    title="This folder is empty"
                    subtitle="Drag and drop here or click on upload button"
                  />
                ) : null
              }

              {
                /* NO SEARCH RESULTS */
                this.hasFilters && !this.hasItems && !isLoading ? (
                  <FileExplorerOverlay
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
              className="hidden"
              ref={fileInputRef}
              type="file"
              onChange={this.onUploadInputChanged}
              multiple={true}
            />
          </div>

          {infoItem && <DriveItemInfoMenu />}
        </div>
      </div>,
    );
  }
}

const dropTargetSpec: DropTargetSpec<FileExplorerProps> = {
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
            folderPath: folderPath,
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
  FileExplorerProps
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
    infoItem: state.storage.infoItem,
    viewMode: state.storage.viewMode,
    namePath: state.storage.namePath,
    workspace: state.session.workspace,
    planLimit: planSelectors.planLimitToShow(state),
    planUsage: state.plan.planUsage,
  };
})(DropTarget([NativeTypes.FILE], dropTargetSpec, dropTargetCollect)(FileExplorer));
