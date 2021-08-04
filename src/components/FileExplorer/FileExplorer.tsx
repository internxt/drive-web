import { createRef, ReactNode, Component, Fragment, DragEvent } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as Unicons from '@iconscout/react-unicons';

import { removeAccents } from '../../lib/utils';
import { getHeaders } from '../../lib/auth';

import { DriveFileData, DriveItemData, FolderPath, UserSettings } from '../../models/interfaces';
import analyticsService from '../../services/analytics.service';
import { DevicePlatform, Workspace } from '../../models/enums';

import { storageThunks, storageActions, storageSelectors, StorageFilters } from '../../store/slices/storage';
import folderService, { ICreatedFolder } from '../../services/folder.service';
import { AppDispatch, RootState } from '../../store';

import DriveItemInfoMenu from '../DriveItemInfoMenu/DriveItemInfoMenu';
import { FileViewMode } from '../../models/enums';
import FilesList from './FilesList/FilesList';
import FilesGrid from './FilesGrid/FilesGrid';
import LoadingFileExplorer from '../LoadingFileExplorer/LoadingFileExplorer';
import folderEmptyImage from '../../assets/images/folder-empty.png';
import noResultsSearchImage from '../../assets/images/no-results-search.png';
import { uiActions } from '../../store/slices/ui';

import './FileExplorer.scss';
import usageService, { UsageResponse } from '../../services/usage.service';
import SessionStorage from '../../lib/sessionStorage';
import deviceService from '../../services/device.service';
import CreateFolderDialog from '../dialogs/CreateFolderDialog/CreateFolderDialog';
import FileExplorerOverlay from './FileExplorerOverlay/FileExplorerOverlay';

interface FileExplorerProps {
  title: JSX.Element | string;
  isLoading: boolean;
  items: DriveItemData[];
  onFileUploaded: () => void;
  onFolderCreated: () => void;
}

interface FilesViewProps {
  user: UserSettings | any;
  currentFolderId: number;
  isDraggingAnItem: boolean;
  selectedItems: DriveFileData[];
  storageFilters: StorageFilters;
  isAuthenticated: boolean;
  itemToShareId: number;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  infoItemId: number;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  sortFunction: ((a: DriveItemData, b: DriveItemData) => number) | null;
  dispatch: AppDispatch;
  workspace: Workspace
}

interface FileExplorerState {
  fileInputRef: React.RefObject<HTMLInputElement>;
  email: string;
  token: string;
  isDragging: boolean;
  searchFunction: any;
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
      isDragging: false,
      searchFunction: null,
      isAdmin: true,
      isMember: false
    };
  }

  moveEvent = {};

  get hasAnyItemSelected(): boolean {
    return this.props.selectedItems.length > 0;
  }

  get hasItems(): boolean {
    return this.props.items.length > 0;
  }

  get hasFilters(): boolean {
    return this.props.storageFilters.text.length > 0;
  }

  componentDidMount = () => {
    deviceService.redirectForMobile();
  }

  onCreateFolderConfirmed(folderName: string): Promise<ICreatedFolder[]> {
    const { currentFolderId } = this.props;
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    return folderService.createFolder(isTeam, currentFolderId, folderName);
  }

  onUploadButtonClicked = (): void => {
    this.state.fileInputRef.current?.click();
  }

  onDownloadButtonClicked = (): void => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageThunks.downloadItemsThunk(selectedItems));
  }

  onUploadInputChanged = async (e) => {
    const limitStorage = SessionStorage.get('limitStorage');
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    try {
      const usage: UsageResponse = await usageService.fetchUsage(isTeam);

      if (limitStorage && usage.total >= parseInt(limitStorage)) {
        this.props.dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
      } else {
        this.dispatchUpload(e);
      }

    } catch (err) {
      this.dispatchUpload(e);
    }
  }

  dispatchUpload = (e) => {
    const { dispatch, onFileUploaded } = this.props;

    dispatch(
      storageThunks.uploadItemsThunk({ files: Array.from(e.target.files) })
    ).then(() => onFileUploaded());
  }

  onViewModeButtonClicked = (): void => {
    const viewMode: FileViewMode = this.props.viewMode === FileViewMode.List ?
      FileViewMode.Grid :
      FileViewMode.List;

    this.props.dispatch(storageActions.setViewMode(viewMode));
  }

  onCreateFolderButtonClicked = () => {
    this.props.dispatch(
      uiActions.setIsCreateFolderDialogOpen(true)
    );
  }

  onBulkDeleteButtonClicked = () => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageActions.setItemsToDelete(selectedItems));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  }

  onPreviousPageButtonClicked = (): void => {
  }

  onNextPageButtonClicked = (): void => {
  }

  getTeamByUser = () => {
    const { user } = this.props;

    return new Promise((resolve, reject) => {
      fetch(`/api/teams-members/${user.email}`, {
        method: 'get',
        headers: getHeaders(true, false)
      }).then((result) => {
        if (result.status !== 200) {
          return;
        }
        return result.json();
      }).then(result => {
        if (result.admin === user.email) {
          result.rol = 'admin';
          this.setState({ isAdmin: true, isMember: false });
        } else {
          result.rol = 'member';
          this.setState({ isAdmin: false, isMember: true });
        }
        resolve(result);
      }).catch(err => {
        console.log(err);
        reject(err);
      });
    });
  }

  setSearchFunction = (e) => {
    const { currentFolderId } = this.props;
    const searchString = removeAccents(e.target.value.toString()).toLowerCase();
    let func: ((item: any) => void) | null = null;

    if (searchString) {
      func = function (item) {
        return item.name.toLowerCase().includes(searchString);
      };
    }

    this.setState({ searchFunction: func });
    this.props.dispatch(
      storageThunks.fetchFolderContentThunk(currentFolderId)
    );
  };

  openFolder = (e): Promise<void> => {
    return new Promise((resolve) => {
      this.props.dispatch(
        storageThunks.fetchFolderContentThunk(e)
      );
      resolve();
    });
  };

  updateNamesPaths = (user, contentFolders, namePath) => {
    if (namePath.length === 0 || namePath[namePath.length - 1].id !== contentFolders.id) {
      return user.root_folder_id === contentFolders.id ? 'All Files' : contentFolders.name;
    }
  }

  clearMoveOpEvent = (moveOpId) => {
    delete this.moveEvent[moveOpId];
  };

  decreaseMoveOpEventCounters = (isError, moveOpId) => {
    this.moveEvent[moveOpId].errors += isError;
    this.moveEvent[moveOpId].total -= 1;
    this.moveEvent[moveOpId].resolved += 1;
  };

  move = (items, destination, moveOpId) => {
    const isTeam = this.props.workspace === Workspace.Business ? true : false;

    // Don't want to request this...
    if (
      items
        .filter((item) => item.isFolder)
        .map((item) => item.id)
        .includes(destination)
    ) {
      return toast.warn('You can\'t move a folder inside itself\'');
    }

    // Init default operation properties
    if (!this.moveEvent[moveOpId]) {
      this.moveEvent[moveOpId] = {
        total: 0,
        errors: 0,
        resolved: 0,
        itemsLength: items.length
      };
    }

    // Increment operation property values
    this.moveEvent[moveOpId].total += items.length;

    // Move Request body
    const data = { destination };

    let keyOp; // Folder or File
    // Fetch for each first levels items

    items.forEach((item) => {
      keyOp = item.isFolder ? 'Folder' : 'File';
      data[keyOp.toLowerCase() + 'Id'] = item.fileId || item.id;
      fetch(`/api/storage/move${keyOp}`, {
        method: 'post',
        headers: getHeaders(true, true, isTeam),
        body: JSON.stringify(data)
      }).then(async (res) => {
        const response = await res.json();
        const success = res.status === 200;
        const moveEvent = this.moveEvent[moveOpId];

        // Decreasing counters...
        this.decreaseMoveOpEventCounters(!success, moveOpId);

        if (!success) {
          toast.warn(`Error moving ${keyOp.toLowerCase()} '${response.item.name}`);
        } else {
          analyticsService.trackMoveItem(keyOp, {
            file_id: response.item.id,
            email: this.props.user.email,
            platform: DevicePlatform.Web
          });
          // Remove myself
          const items = this.props.items.filter((commanderItem: any) =>
            item.isFolder
              ? !commanderItem.isFolder ||
              (commanderItem.isFolder && !(commanderItem.id === item.id))
              : commanderItem.isFolder ||
              (!commanderItem.isFolder && !(commanderItem.fileId === item.fileId))
          );
          // update state for updating commander items list

          this.props.dispatch(storageActions.setItems(items));
        }

        if (moveEvent.total === 0) {
          this.clearMoveOpEvent(moveOpId);
          // If empty folder list move back
          if (!this.props.items.length) {
            this.folderTraverseUp();
          }
        }
      });
    });
  };

  removeFileFromFileExplorer = (filename) => {
    const index = this.props.items.findIndex((item: DriveItemData) => item.name === filename);

    if (!~index) {
      // prevent undesired removals
      return;
    }

    this.props.dispatch(
      storageActions.setItems(Array.from(this.props.items).splice(index, 1))
    );
  }

  folderTraverseUp() {
    const { dispatch, namePath } = this.props;

    dispatch(storageActions.popNamePath);

    dispatch(
      storageThunks.fetchFolderContentThunk(_.last(namePath).id)
    );
  }

  onViewDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    // e.stopPropagation();

    this.props.dispatch(storageActions.setIsDraggingAnItem(true));
  }

  onViewDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    // console.log('onViewDragLeave: ', e);
    this.props.dispatch(storageActions.setIsDraggingAnItem(false));
  }

  onViewDrop = async (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    const itemsDragged = await getAllItems(e.dataTransfer);
    const { numberOfItems, root } = itemsDragged;

    await this.props.dispatch(storageThunks.createFolderTreeStructureThunk({ root, currentFolderId: this.props.currentFolderId }));

    this.props.dispatch(storageActions.setIsDraggingAnItem(false));
  }

  render(): ReactNode {
    const {
      isLoading,
      infoItemId,
      viewMode,
      isDraggingAnItem,
      title,
      items,
      isCreateFolderDialogOpen,
      onFolderCreated
    } = this.props;
    const { fileInputRef } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: <Unicons.UilGrid />,
      [FileViewMode.Grid]: <Unicons.UilListUiAlt />
    };
    const viewModes = {
      [FileViewMode.List]: <FilesList items={items} />,
      [FileViewMode.Grid]: <FilesGrid items={items} />
    };

    return (
      <Fragment>
        {isCreateFolderDialogOpen && <CreateFolderDialog onFolderCreated={onFolderCreated} />}

        <div className="flex flex-grow h-1 ">
          <div className="flex-grow flex flex-col">
            <div className="flex justify-between pb-4">
              <div className="text-lg">
                {title}
              </div>

              <div className="flex">
                {this.hasAnyItemSelected ?
                  <button className="primary mr-2 flex items-center" onClick={this.onDownloadButtonClicked}>
                    <Unicons.UilCloudDownload className="h-5 mr-1.5" /><span>Download</span>
                  </button> :
                  <button className="primary mr-1.5 flex items-center" onClick={this.onUploadButtonClicked}>
                    <Unicons.UilCloudUpload className="h-5 mr-1.5" /><span>Upload</span>
                  </button>
                }
                {!this.hasAnyItemSelected ? <button className="w-8 secondary square mr-2" onClick={this.onCreateFolderButtonClicked}>
                  <Unicons.UilFolderPlus />
                </button> : null}
                {this.hasAnyItemSelected ? <button className="w-8 secondary square mr-2" onClick={this.onBulkDeleteButtonClicked}>
                  <Unicons.UilTrashAlt />
                </button> : null}
                <button className="secondary square w-8" onClick={this.onViewModeButtonClicked}>
                  {viewModesIcons[viewMode]}
                </button>
              </div>
            </div>

            <div className="relative h-full flex flex-col justify-between flex-grow overflow-y-hidden">
              <div
                onDragOver={this.onViewDragOver}
                onDragLeave={this.onViewDragLeave}
                onDrop={this.onViewDrop}
                className="flex flex-col justify-between flex-grow overflow-y-auto overflow-x-hidden"
              >
                {isLoading ?
                  <LoadingFileExplorer /> :
                  viewModes[viewMode]
                }
              </div>

              {/* PAGINATION */}
              {(false && !isLoading) ? (
                <div className="pointer-events-none bg-white p-4 h-12 flex justify-center items-center rounded-b-4px">
                  <span className="text-sm w-1/3" />
                  <div className="flex justify-center w-1/3">
                    <button onClick={this.onPreviousPageButtonClicked} className="pagination-button">
                      <Unicons.UilAngleDoubleLeft />
                    </button>
                    <button className="pagination-button">
                      1
                    </button>
                    <button onClick={this.onNextPageButtonClicked} className="pagination-button">
                      <Unicons.UilAngleDoubleRight />
                    </button>
                  </div>
                  <div className="w-1/3"></div>
                </div>
              ) : null}

              {/* EMPTY FOLDER */
                !this.hasFilters && !this.hasItems && !isLoading ?
                  <FileExplorerOverlay
                    icon={<img alt="" src={folderEmptyImage} className="w-full m-auto" />}
                    title="This folder is empty"
                    subtitle="Drag and drop here or click on upload button"
                  />
                  :
                  null
              }

              {/* NO SEARCH RESULTS */
                this.hasFilters && !this.hasItems && !isLoading ?
                  <FileExplorerOverlay
                    icon={<img alt="" src={noResultsSearchImage} className="w-full m-auto" />}
                    title="There are no results for this search"
                    subtitle="Drag and drop here or click on upload button"
                  />
                  :
                  null
              }

              {/* DRAG AND DROP */
                isDraggingAnItem ?
                  <div
                    className="drag-over-effect pointer-events-none absolute h-full w-full flex justify-center items-end"
                  ></div> :
                  null
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

          {
            infoItemId ? <DriveItemInfoMenu/> : null
          }
        </div>
      </Fragment>
    );
  }
}

export default connect(
  (state: RootState) => {
    const currentFolderId: number = storageSelectors.currentFolderId(state);

    return {
      isAuthenticated: state.user.isAuthenticated,
      user: state.user.user,
      currentFolderId,
      selectedItems: state.storage.selectedItems,
      storageFilters: state.storage.filters,
      isDraggingAnItem: state.storage.isDraggingAnItem,
      itemToShareId: state.storage.itemToShareId,
      isCreateFolderDialogOpen: state.ui.isCreateFolderDialogOpen,
      isDeleteItemsDialogOpen: state.ui.isDeleteItemsDialogOpen,
      infoItemId: state.storage.infoItemId,
      viewMode: state.storage.viewMode,
      namePath: state.storage.namePath,
      sortFunction: state.storage.sortFunction,
      workspace: state.team.workspace
    };
  })(FileExplorer);