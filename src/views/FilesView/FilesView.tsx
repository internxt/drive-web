import { createRef, Component, Fragment } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { removeAccents } from '../../lib/utils';

import { getHeaders } from '../../lib/auth';

import localStorageService from '../../services/localStorage.service';

import { UserSettings } from '../../models/interfaces';
import analyticsService from '../../services/analytics.service';
import { DevicePlatform } from '../../models/enums';

import { uiActions } from '../../store/slices/ui';
import { storageThunks, storageActions } from '../../store/slices/storage';
import folderService, { ICreatedFolder } from '../../services/folder.service';
import { AppDispatch, RootState } from '../../store';

import Breadcrumbs, { BreadcrumbItemData } from '../../components/Breadcrumbs/Breadcrumbs';
import iconService, { IconType } from '../../services/icon.service';
import FileActivity from '../../components/FileActivity/FileActivity';
import { FileViewMode } from '../../components/FileView/models/enums';
import FileList from '../../components/FileView/FileList/FileList';
import FileGrid from '../../components/FileView/FileGrid/FileGrid';
import LoadingFileExplorer from '../../components/LoadingFileExplorer/LoadingFileExplorer';

import './FilesView.scss';
import { checkFileNameExists, getNewFolderName } from '../../services/storage.service/storage-name.service';

interface FilesViewProps {
  user: UserSettings | any,
  currentFolderId: number;
  selectedItems: number[];
  isLoadingItems: boolean,
  currentItems: any[],
  selectedItemsIds: number[]
  isAuthenticated: boolean;
  itemToShareId: number;
  itemsToDeleteIds: number[];
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  infoItemId: number;
  viewMode: FileViewMode;
  namePath: any[];
  sortFunction: ((a: any, b: any) => number) | null;
  dispatch: AppDispatch;
}

interface FilesViewState {
  fileInputRef: React.RefObject<HTMLInputElement>;
  email: string;
  token: string;
  rateLimitModal: boolean;
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
      rateLimitModal: false,
      searchFunction: null,
      isAdmin: true,
      isMember: false
    };
  }

  moveEvent = {};

  get breadcrumbItems(): BreadcrumbItemData[] {
    const items: BreadcrumbItemData[] = [];

    items.push({
      name: 'storage',
      label: '',
      icon: iconService.getIcon(IconType.BreadcrumbsStorage),
      active: true
    });
    items.push({
      name: 'folder-parent-name',
      label: 'FolderParentName',
      icon: iconService.getIcon(IconType.BreadcrumbsFolder),
      active: false
    });

    return items;
  }

  get hasAnyItemSelected(): boolean {
    return this.props.selectedItems.length > 0;
  }

  componentDidMount = () => {
    this.props.dispatch(
      storageThunks.fetchFolderContentThunk(this.props.user.root_folder_id)
    );
  }

  onCreateFolderConfirmed(folderName: string): Promise<ICreatedFolder[]> {
    const { user, currentFolderId } = this.props;

    return folderService.createFolder(!!user.teams, currentFolderId, folderName);
  }

  onUploadButtonClicked = (): void => {
    this.state.fileInputRef.current?.click();
  }

  onUploadInputChanged = (e) => {
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
      uiActions.setIsCreateFolderDialogOpen(true)
    );
  }

  onBulkDownloadButtonClicked = () => {
    console.log('on bulk download button clicked');
  }

  onBulkDeleteButtonClicked = () => {
    console.log('on bulk delete button clicked!');
  }

  onPreviousPageButtonClicked = (): void => {
    console.log('previous page button clicked!');
  }

  onNextPageButtonClicked = (): void => {
    console.log('next page button clicked!');
  }

  getTeamByUser = () => {
    return new Promise((resolve, reject) => {
      const user: UserSettings = localStorageService.getUser();

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

  createFolderByName = (folderName, parentFolderId) => {
    const { currentItems, user, namePath } = this.props;

    let newFolderName = folderName;

    // No parent id implies is a directory created on the current folder, so let's show a spinner
    if (!parentFolderId) {

      if (checkFileNameExists(currentItems, newFolderName, undefined)) {
        newFolderName = getNewFolderName(newFolderName, currentItems);
      }

      currentItems.push({
        name: newFolderName,
        isLoading: true,
        isFolder: true
      });

      this.props.dispatch(
        storageActions.setItems(currentItems)
      );
    } else {
      newFolderName = getNewFolderName(newFolderName, currentItems);
    }

    parentFolderId = parentFolderId || this.props.currentFolderId;

    return new Promise((resolve, reject) => {
      fetch('/api/storage/folder', {
        method: 'post',
        headers: getHeaders(true, true, user.teams),
        body: JSON.stringify({
          parentFolderId,
          folderName: newFolderName,
          teamId: _.last(namePath) && _.last(namePath).hasOwnProperty('id_team') ? _.last(namePath).id_team : null
        })
      })
        .then(async (res) => {
          const data = await res.json();

          if (res.status !== 201) {
            throw data;
          }
          return data;
        })
        .then(resolve)
        .catch(reject);
    });
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
    const { user } = this.props;

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
        headers: getHeaders(true, true, user.teams),
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

  render(): JSX.Element {
    const { isLoadingItems, infoItemId, viewMode } = this.props;
    const { fileInputRef } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: iconService.getIcon(IconType.MosaicView),
      [FileViewMode.Grid]: iconService.getIcon(IconType.ListView)
    };
    const viewModes = {
      [FileViewMode.List]: <FileList />,
      [FileViewMode.Grid]: <FileGrid />
    };

    return (
      <Fragment>
        <div className="flex flex-grow h-1 ">
          <div className="flex-grow flex flex-col">
            <div className="flex justify-between pb-4">
              <div>
                <span className="text-base font-semibold"> Drive </span>
                <Breadcrumbs items={this.breadcrumbItems} />
              </div>

              <div className="flex">
                <button className="primary mr-1 flex items-center" onClick={this.onUploadButtonClicked}>
                  <img alt="" className="h-3 mr-2" src={iconService.getIcon(IconType.Upload)} /><span>Upload</span>
                </button>
                {!this.hasAnyItemSelected ? <button className="w-8 secondary square mr-1" onClick={this.onCreateFolderButtonClicked}>
                  <img alt="" src={iconService.getIcon(IconType.CreateFolder)} />
                </button> : null}
                {this.hasAnyItemSelected ? <button className="w-8 secondary square mr-1" onClick={this.onBulkDownloadButtonClicked}>
                  <img alt="" src={iconService.getIcon(IconType.DownloadItems)} />
                </button> : null}
                {this.hasAnyItemSelected ? <button className="w-8 secondary square mr-1" onClick={this.onBulkDeleteButtonClicked}>
                  <img alt="" src={iconService.getIcon(IconType.DeleteItems)} />
                </button> : null}
                <button className="secondary square w-8" onClick={this.onViewModeButtonClicked}>
                  <img alt="" src={viewModesIcons[viewMode]} />
                </button>
              </div>
            </div>

            <div className="relative h-full flex flex-col justify-between flex-grow overflow-y-hidden">
              <div className="flex flex-col justify-between flex-grow overflow-y-auto">
                {isLoadingItems ?
                  <LoadingFileExplorer /> :
                  viewModes[viewMode]
                }

                {/* PAGINATION */}
                {!isLoadingItems && (
                  <div className="bg-white p-4 h-12 flex justify-center items-center rounded-b-4px">
                    <span className="text-sm w-1/3">Showing 15 items of 450</span>
                    <div className="flex justify-center w-1/3">
                      <div onClick={this.onPreviousPageButtonClicked} className="pagination-button">
                        <img alt="" src={iconService.getIcon(IconType.PreviousPage)} />
                      </div>
                      <div className="pagination-button">
                        1
                      </div>
                      <div onClick={this.onNextPageButtonClicked} className="pagination-button">
                        <img alt="" src={iconService.getIcon(IconType.NextPage)} />
                      </div>
                    </div>
                    <div className="w-1/3"></div>
                  </div>
                )}
              </div>

              {/* DRAG AND DROP */}
              {
                false ?
                  (false ?
                    <div className="p-8 absolute bg-white h-full w-full">
                      <div className="h-full flex items-center justify-center rounded-12px border-3 border-blue-40 border-dashed">
                        <div className="mb-28">
                          <img alt="" src={iconService.getIcon(IconType.DragAndDrop)} className="w-36 m-auto" />
                          <div className="text-center">
                            <span className="font-semibold text-base text-m-neutral-100 block">
                              Drag and drop here
                            </span>
                            <span className="text-sm text-m-neutral-100 block">
                              or click on upload button
                            </span>
                          </div>
                        </div>
                      </div>
                    </div> :
                    <div className="absolute bg-opacity-30 bg-blue-50 border-blue-60 border-2 rounded-6px h-full w-full flex justify-center items-end">
                      <div className="drag-and-drop-with-items-message-container mb-10 bg-white rounded-4px flex items-center w-72 py-2 pl-2 pr-8">
                        <img alt="" src={iconService.getIcon(IconType.DragAndDrop)} className="w-14 mr-2" />
                        <span className="text-xs">
                          Drop the files here to immediately upload them to <span className="text-blue-60 font-semibold">myBackup</span> folder
                        </span>
                      </div>
                    </div>) :
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
  (state: RootState) => ({
    isAuthenticated: state.user.isAuthenticated,
    user: state.user.user,
    selectedItems: state.storage.selectedItems,
    currentFolderId: state.storage.currentFolderId,
    currentFolderBucket: state.storage.currentFolderBucket,
    isLoadingItems: state.storage.isLoading,
    currentItems: state.storage.items,
    selectedItemsIds: state.storage.selectedItems,
    itemToShareId: state.storage.itemToShareId,
    itemsToDeleteIds: state.storage.itemsToDeleteIds,
    isCreateFolderDialogOpen: state.ui.isCreateFolderDialogOpen,
    isDeleteItemsDialogOpen: state.ui.isDeleteItemsDialogOpen,
    infoItemId: state.storage.infoItemId,
    viewMode: state.storage.viewMode,
    namePath: state.storage.namePath,
    sortFunction: state.storage.sortFunction
  }))(FilesView);