import { createRef, ReactNode, Component, Fragment, DragEvent } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as Unicons from '@iconscout/react-unicons';

import { removeAccents } from '../../lib/utils';
import { getHeaders } from '../../lib/auth';

import { DriveFileData, DriveFolderData, FolderPath, TeamsSettings, UserSettings } from '../../models/interfaces';
import analyticsService from '../../services/analytics.service';
import { DevicePlatform, Workspace } from '../../models/enums';

import { selectShowReachedLimitModal, setShowCreateFolderModal, setShowDeleteModal, setShowReachedPlanLimit } from '../../store/slices/ui';
import { storageThunks, storageActions, storageSelectors } from '../../store/slices/storage';
import folderService, { ICreatedFolder } from '../../services/folder.service';
import { AppDispatch, RootState } from '../../store';

import Breadcrumbs, { BreadcrumbItemData } from '../../components/Breadcrumbs/Breadcrumbs';
import FileActivity from '../../components/FileActivity/FileActivity';
import { FileViewMode } from '../../models/enums';
import FilesList from '../../components/FilesView/FilesList/FilesList';
import FilesGrid from '../../components/FilesView/FilesGrid/FilesGrid';
import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';
import dragAndDropImage from '../../assets/images/drag-and-drop.png';

import './FilesView.scss';
import usageService, { UsageResponse } from '../../services/usage.service';
import SessionStorage from '../../lib/sessionStorage';
import { handleChangeWorkspaceThunk } from '../../store/slices/user';
import localStorageService from '../../services/localStorage.service';

interface FilesViewProps {
  user: UserSettings | any;
  currentFolderId: number;
  isCurrentFolderEmpty: boolean;
  isDraggingAnItem: boolean;
  selectedItems: DriveFileData[];
  isLoadingItems: boolean,
  currentItems: (DriveFileData | DriveFolderData)[],
  isAuthenticated: boolean;
  itemToShareId: number;
  showCreateFolderModal: boolean;
  showDeleteModal: boolean;
  infoItemId: number;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  sortFunction: ((a: DriveFileData | DriveFolderData, b: DriveFileData | DriveFolderData) => number) | null;
  dispatch: AppDispatch;
  workspace: Workspace
}

interface FilesViewState {
  fileInputRef: React.RefObject<HTMLInputElement>;
  email: string;
  token: string;
  isDragging: boolean;
  searchFunction: any;
  isAdmin: boolean;
  isMember: boolean;
}

class FilesView extends Component<FilesViewProps, FilesViewState> {
  constructor(props: FilesViewProps) {
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

  get breadcrumbItems(): BreadcrumbItemData[] {
    const { namePath, dispatch } = this.props;
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const firstPath: FolderPath = namePath[0];

      items.push({
        id: firstPath.id,
        label: 'Drive',
        icon: <Unicons.UilHdd className="h-4" />,
        active: true,
        onClick: () => dispatch(storageThunks.goToFolderThunk(firstPath))
      });
      namePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => dispatch(storageThunks.goToFolderThunk(path))
        });
      });
    }

    return items;
  }

  get hasAnyItemSelected(): boolean {
    return this.props.selectedItems.length > 0;
  }

  componentDidMount = () => {
    const { dispatch } = this.props;

    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageThunks.fetchFolderContentThunk());
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

      console.log('usage =>', usage, 'limit =>', limitStorage);
      if (limitStorage && usage.total >= parseInt(limitStorage)) {
        this.props.dispatch(setShowReachedPlanLimit(true));
      } else {
        this.dispatchUpload(e);
      }

    } catch (err) {
      this.dispatchUpload(e);
    }
  }

  dispatchUpload = (e) => {
    const { dispatch } = this.props;

    dispatch(
      storageThunks.uploadItemsThunk({ files: Array.from(e.target.files) })
    ).then(() => {
      dispatch(
        storageThunks.fetchFolderContentThunk()
      );
    });
  }

  onViewModeButtonClicked = (): void => {
    const viewMode: FileViewMode = this.props.viewMode === FileViewMode.List ?
      FileViewMode.Grid :
      FileViewMode.List;

    this.props.dispatch(storageActions.setViewMode(viewMode));
  }

  onCreateFolderButtonClicked = () => {
    this.props.dispatch(
      setShowCreateFolderModal(true)
    );
  }

  onBulkDeleteButtonClicked = () => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageActions.setItemsToDelete(selectedItems));
    dispatch(setShowDeleteModal(true));
  }

  onPreviousPageButtonClicked = (): void => {
    console.log('previous page button clicked!');
  }

  onNextPageButtonClicked = (): void => {
    console.log('next page button clicked!');
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
          const items = this.props.currentItems.filter((commanderItem: any) =>
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
          if (!this.props.currentItems.length) {
            this.folderTraverseUp();
          }
        }
      });
    });
  };

  removeFileFromFileExplorer = (filename) => {
    const index = this.props.currentItems.findIndex((obj: any) => obj.name === filename);

    if (!~index) {
      // prevent undesired removals
      return;
    }

    this.props.dispatch(
      storageActions.setItems(Array.from(this.props.currentItems).splice(index, 1))
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
    e.stopPropagation();

    this.props.dispatch(storageActions.setIsDraggingAnItem(true));
  }

  onViewDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    console.log('onViewDragLeave: ', e);
    this.props.dispatch(storageActions.setIsDraggingAnItem(false));
  }

  onViewDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    console.log('onViewDrop');

    this.props.dispatch(storageActions.setIsDraggingAnItem(false));
  }

  render(): ReactNode {
    const { isLoadingItems, infoItemId, viewMode, isCurrentFolderEmpty, isDraggingAnItem } = this.props;
    const { fileInputRef } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: <Unicons.UilGrid />,
      [FileViewMode.Grid]: <Unicons.UilListUiAlt />
    };
    const viewModes = {
      [FileViewMode.List]: <FilesList />,
      [FileViewMode.Grid]: <FilesGrid />
    };

    return (
      <Fragment>
        <div className="flex flex-grow h-1 ">
          <div className="flex-grow flex flex-col">
            <div className="flex justify-between pb-4">
              <div>
                <Breadcrumbs items={this.breadcrumbItems} />
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
                {isLoadingItems ?
                  <LoadingFileExplorer /> :
                  viewModes[viewMode]
                }
              </div>

              {/* PAGINATION */}
              {(false && !isLoadingItems) ? (
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
                isCurrentFolderEmpty && !isLoadingItems ?
                  <div className="pointer-events-none p-8 absolute bg-white h-full w-full">
                    <div className="h-full flex items-center justify-center rounded-12px border-3 border-blue-40 border-dashed">
                      <div className="mb-28">
                        <img alt="" src={dragAndDropImage} className="w-36 m-auto" />
                        <div className="text-center">
                          <span className="font-semibold text-base text-m-neutral-100 block">
                            Drag and drop here
                          </span>
                          <span className="text-sm text-m-neutral-100 block">
                            or use the upload button
                          </span>
                        </div>
                      </div>
                    </div>
                  </div> :
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
            infoItemId ? <FileActivity /> : null
          }
        </div>
      </Fragment>
    );
  }
}

export default connect(
  (state: RootState) => {
    const isCurrentFolderEmpty: boolean = storageSelectors.isCurrentFolderEmpty(state);
    const currentFolderId: number = storageSelectors.currentFolderId(state);

    return {
      isAuthenticated: state.user.isAuthenticated,
      user: state.user.user,
      currentFolderId,
      selectedItems: state.storage.selectedItems,
      isCurrentFolderEmpty,
      isDraggingAnItem: state.storage.isDraggingAnItem,
      isLoadingItems: state.storage.isLoading,
      currentItems: state.storage.items,
      itemToShareId: state.storage.itemToShareId,
      showCreateFolderModal: state.ui.showCreateFolderModal,
      showDeleteModal: state.ui.showDeleteModal,
      infoItemId: state.storage.infoItemId,
      viewMode: state.storage.viewMode,
      namePath: state.storage.namePath,
      sortFunction: state.storage.sortFunction,
      workspace: state.team.workspace
    };
  })(FilesView);