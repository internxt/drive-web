import { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import $ from 'jquery';
import _ from 'lodash';
import update from 'immutability-helper';
import async from 'async';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { removeAccents, getFilenameAndExt, renameFile, encryptFilename } from '../../lib/utils';

import { getHeaders } from '../../lib/auth';

import localStorageService from '../../services/localStorage.service';
import { Network, getEnvironmentConfig } from '../../lib/network';
import history from '../../lib/history';

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
  sortFunction: ((a: any, b: any) => number) | null;
  dispatch: AppDispatch;
}

interface FilesViewState {
  viewMode: FileViewMode;
  email: string;
  isAuthorized: boolean;
  isTeam: boolean;
  token: string;
  rateLimitModal: boolean;
  namePath: any[];
  searchFunction: any;
  isAdmin: boolean;
  isMember: boolean;
}

class FilesView extends Component<FilesViewProps, FilesViewState> {
  constructor(props: FilesViewProps) {
    super(props);

    this.state = {
      viewMode: FileViewMode.List,
      email: '',
      isAuthorized: false,
      isTeam: false,
      token: '',
      rateLimitModal: false,
      namePath: [],
      searchFunction: null,
      isAdmin: true,
      isMember: false
    };

    this.onViewModeButtonClicked = this.onViewModeButtonClicked.bind(this);
    this.onCreateFolderButtonClicked = this.onCreateFolderButtonClicked.bind(this);
    this.onBulkDownloadButtonClicked = this.onBulkDownloadButtonClicked.bind(this);
    this.onBulkDeleteButtonClicked = this.onBulkDeleteButtonClicked.bind(this);
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

  onViewModeButtonClicked(): void {
    const viewMode: FileViewMode = this.state.viewMode === FileViewMode.List ?
      FileViewMode.Grid :
      FileViewMode.List;

    this.setState({ viewMode });
  }

  onCreateFolderButtonClicked() {
    this.props.dispatch(
      uiActions.setIsCreateFolderDialogOpen(true)
    );
  }

  onBulkDownloadButtonClicked() {
    console.log('on bulk download button clicked');
  }

  onBulkDeleteButtonClicked() {
    console.log('on bulk delete button clicked!');
  }

  onPreviousPageButtonClicked(): void {
    console.log('previous page button clicked!');
  }

  onNextPageButtonClicked(): void {
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

  folderNameExists = (folderName) => {
    return this.props.currentItems.find(
      (item: any) => item.isFolder && item.name === folderName
    );
  };

  fileNameExists = (fileName, type) => {
    return this.props.currentItems.some(
      (item: any) => !item.isFolder && item.name === fileName && item.type === type
    );
  };

  getNextNewName = (originalName, i) => `${originalName} (${i})`;

  getNewFolderName = (name) => {
    let exists = false;

    let i = 1;
    const currentFolder = this.props.currentItems.filter((item: any) => item.isFolder);

    let finalName = name;

    const foldName = name.replace(/ /g, '');

    currentFolder.map((folder: any) => {
      const fold = folder.name.replace(/ /g, '');

      if (foldName === fold) {
        exists = true;
      } else {
        exists = false;
        finalName = name;
      }
    });

    while (exists) {
      const newName = this.getNextNewName(name, i);

      exists = currentFolder.find((folder: any) => folder.name === newName) !== undefined;
      i += 1;
      finalName = newName;
    }

    return finalName;
  };

  getNewFileName = (name, type) => {
    let exists = true;

    let i = 1;

    let finalName;
    const currentFiles = this.props.currentItems.filter((item: any) => !item.isFolder);

    while (exists) {
      const newName = this.getNextNewName(name, i);

      exists = currentFiles.find((file: any) => file.name === newName && file.type === type) !== undefined;
      finalName = newName;
      i += 1;
    }

    return finalName;
  };

  getNewName = (name, type = undefined) => {
    // if has type is file
    if (type) {
      return this.getNewFileName(name, type);
    }

    return this.getNewFolderName(name);
  };

  createFolderByName = (folderName, parentFolderId) => {
    let newFolderName = folderName;

    // No parent id implies is a directory created on the current folder, so let's show a spinner
    if (!parentFolderId) {
      const items: any[] = this.props.currentItems;

      if (this.folderNameExists(newFolderName)) {
        newFolderName = this.getNewName(newFolderName);
      }

      items.push({
        name: newFolderName,
        isLoading: true,
        isFolder: true
      });

      this.props.dispatch(
        storageActions.setItems(items)
      );
    } else {
      newFolderName = this.getNewName(newFolderName);
    }

    parentFolderId = parentFolderId || this.props.currentFolderId;

    return new Promise((resolve, reject) => {
      fetch('/api/storage/folder', {
        method: 'post',
        headers: getHeaders(true, true, this.state.isTeam),
        body: JSON.stringify({
          parentFolderId,
          folderName: newFolderName,
          teamId: _.last(this.state.namePath) && _.last(this.state.namePath).hasOwnProperty('id_team') ? _.last(this.state.namePath).id_team : null
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
        headers: getHeaders(true, true, this.state.isTeam),
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

          this.props.dispatch(
            storageActions.setItems(items)
          );
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

  openUploadFile = () => {
    $('input#uploadFileControl').val(null);
    $('input#uploadFileControl').trigger('click');
  };

  trackFileUploadStart = (file, parentFolderId) => {
    analyticsService.trackFileUploadStart({
      file_size: file.size,
      file_type: file.type,
      folder_id: parentFolderId,
      email: this.props.user.email,
      platform: DevicePlatform.Web
    });
  }

  trackFileUploadError = (file, parentFolderId, msg) => {
    analyticsService.trackFileUploadError({
      file_size: file.size,
      file_type: file.type,
      folder_id: parentFolderId,
      email: this.props.user.email,
      msg,
      platform: DevicePlatform.Web
    });
  }

  trackFileUploadFinished = (file) => {
    analyticsService.trackFileUploadFinished({
      email: this.props.user.email,
      file_size: file.size,
      file_type: file.type,
      file_id: file.id
    });
  }

  upload = async (file, parentFolderId, folderPath) => {
    if (!parentFolderId) {
      throw new Error('No folder ID provided');
    }

    try {
      this.trackFileUploadStart(file, parentFolderId);

      const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(this.state.isTeam);

      if (!bucketId) {
        // coming from auto-login or something else that is not loading all required data
        window.analytics.track('file-upload-bucketid-undefined', {
          email: this.props.user.email,
          platform: DevicePlatform.Web
        });

        toast.warn('Login again to start uploading files');
        localStorageService.clear();
        history.push('/login');
        return;
      }

      const network = new Network(bridgeUser, bridgePass, encryptionKey);

      const relativePath = folderPath + file.name + (file.type ? '.' + file.type : '');
      const content = new Blob([file.content], { type: file.type });

      const fileId = await network.uploadFile(bucketId, {
        filepath: relativePath,
        filesize: file.size,
        filecontent: content,
        progressCallback: () => { }
      });

      const name = encryptFilename(file.name, parentFolderId);

      const folder_id = parentFolderId;
      const { size, type } = file;
      const encrypt_version = '03-aes';
      // TODO: fix mismatched fileId fields in server and remove file_id here
      const fileEntry = { fileId, file_id: fileId, type, bucket: bucketId, size, folder_id, name, encrypt_version };
      const headers = getHeaders(true, true, this.state.isTeam);

      const createFileEntry = () => {
        const body = JSON.stringify({ file: fileEntry });
        const params = { method: 'post', headers, body };

        return fetch('/api/storage/file', params);
      };

      let res;
      const data = await createFileEntry().then(response => {
        res = response;
        return res.json();
      });

      this.trackFileUploadFinished({ size, type, id: data.id });

      return { res, data };

    } catch (err) {
      this.trackFileUploadError(file, parentFolderId, err.message);
      toast.warn(`File upload error. Reason: ${err.message}`);

      throw err;
    }
  };

  handleUploadFiles = async (files, parentFolderId, folderPath = null) => {
    const dispatch = this.props.dispatch;
    const currentFolderId = this.props.currentFolderId;

    files = Array.from(files);

    const filesToUpload: any[] = [];
    const MAX_ALLOWED_UPLOAD_SIZE = 1024 * 1024 * 1024;
    const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);

    console.log('File size trying to be uplodaded is %s bytes', files.reduce((accum, file) => accum + file.size, 0));

    if (showSizeWarning) {
      toast.warn('File too large.\nYou can only upload or download files of up to 1GB through the web app');
      return;
    }

    parentFolderId = parentFolderId || currentFolderId;

    files.forEach(file => {
      const { filename, extension } = getFilenameAndExt(file.name);

      filesToUpload.push({ name: filename, size: file.size, type: extension, isLoading: true, content: file });
    });

    for (const file of filesToUpload) {
      const fileNameExists = this.fileNameExists(file.name, file.type);

      if (parentFolderId === currentFolderId) {
        dispatch(storageActions.setItems([...this.props.currentItems, file]));

        if (fileNameExists) {
          file.name = this.getNewName(file.name, file.type);
          // File browser object don't allow to rename, so you have to create a new File object with the old one.
          file.content = renameFile(file.content, file.name);
        }
      }
    }

    let fileBeingUploaded;
    const uploadErrors: any[] = [];

    try {
      await async.eachLimit(filesToUpload, 1, (file, nextFile) => {
        fileBeingUploaded = file;

        let relativePath = this.state.namePath.map((pathLevel: any) => pathLevel.name).slice(1).join('/');

        // when a folder and its subdirectory is uploaded by drop, this.state.namePath keeps its value at the first level of the parent folder
        // so we need to add the relative folderPath (the path from parent folder uploaded to the level of the file being uploaded)
        // when uploading deeper files than the current level
        if (folderPath) {
          if (relativePath !== '') {
            relativePath += '/' + folderPath;
          } else {
            // if is the first path level, DO NOT ADD a '/'
            relativePath += folderPath;
          }
        }

        let rateLimited = false;

        this.upload(file, parentFolderId, relativePath)
          .then(({ res, data }: any) => {
            if (parentFolderId === currentFolderId) {
              const { currentItems } = this.props;
              const index = currentItems.findIndex((obj: any) => obj.name === file.name);
              const filesInFileExplorer: any[] = [...currentItems];

              filesInFileExplorer[index].isLoading = false;
              filesInFileExplorer[index].fileId = data.fileId;
              filesInFileExplorer[index].id = data.id;

              dispatch(storageActions.setItems(filesInFileExplorer));
            }

            if (res.status === 402) {
              this.setState({ rateLimitModal: true });
              rateLimited = true;
              throw new Error('Rate limited');
            }
          }).catch((err) => {
            uploadErrors.push(err);
            console.log(err);

            this.removeFileFromFileExplorer(fileBeingUploaded.name);
          }).finally(() => {
            if (rateLimited) {
              return nextFile(Error('Rate limited'));
            }
            nextFile(null);
          });

        if (uploadErrors.length > 0) {
          throw new Error('There were some errors during upload');
        }
      });
    } catch (err) {
      if (err.message === 'There were some errors during upload') {
        // TODO: List errors in a queue?
        return uploadErrors.forEach(uploadError => {
          toast.warn(uploadError.message);
        });
      }

      toast.warn(err.message);
    }
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

  uploadFile = (e) => {
    this.handleUploadFiles(e.target.files, undefined, undefined).then(() => {
      this.props.dispatch(
        storageThunks.fetchFolderContentThunk(this.props.currentFolderId)
      );
    });
  }

  uploadDroppedFile = (e, uuid, folderPath) => {
    return this.handleUploadFiles(e, uuid, folderPath);
  }

  folderTraverseUp() {
    this.setState(this.popNamePath(), () => {
      this.props.dispatch(
        storageThunks.fetchFolderContentThunk(_.last(this.state.namePath).id)
      );
    });
  }

  pushNamePath(path) {
    return update(this.state.namePath, { $push: [path] });
  }

  popNamePath() {
    return (previousState, currentProps) => {
      return {
        ...previousState,
        namePath: _.dropRight(previousState.namePath)
      };
    };
  }

  openRateLimitModal = () => {
    this.setState({ rateLimitModal: true });
  }

  closeRateLimitModal = () => {
    this.setState({ rateLimitModal: false });
  };

  render(): JSX.Element {
    const { isLoadingItems, infoItemId } = this.props;
    const { viewMode } = this.state;
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
        <div className="flex flex-grow">
          <div className="flex-grow flex flex-col">
            <div className="flex justify-between pb-4">
              <div>
                <span className="text-base font-semibold"> Drive </span>
                <Breadcrumbs items={this.breadcrumbItems} />
              </div>

              <div className="flex">
                <button className="primary mr-1 flex items-center">
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

            <div className="flex flex-col justify-between flex-grow">
              {isLoadingItems ?
                <LoadingFileExplorer /> :
                viewModes[viewMode]
              }

              {/* PAGINATION */}
              {!isLoadingItems && (
                <div className="bg-white px-4 h-12 flex justify-center items-center rounded-b-4px">
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
    sortFunction: state.storage.sortFunction
  }))(FilesView);