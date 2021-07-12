import * as React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { isMobile, isAndroid, isIOS } from 'react-device-detect';
import $ from 'jquery';
import _ from 'lodash';
import fileDownload from 'js-file-download';
import update from 'immutability-helper';
import async from 'async';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import FileActivity from '../../components/FileActivity/FileActivity';
import AppHeader from '../../components/AppHeader/AppHeader';
import FileView from '../../components/FileView/FileView';

import { removeAccents, getFilenameAndExt, renameFile, encryptFilename } from '../../lib/utils';

import { getHeaders } from '../../lib/auth';

import { getUserData } from '../../lib/analytics';
import localStorageService from '../../services/localStorage.service';
import { Network, getEnvironmentConfig } from '../../lib/network';
import { storeTeamsInfo } from '../../services/teams.service';
import history from '../../lib/history';

import './NewXCloud.scss';
import { setHasConnection } from '../../store/slices/networkSlice';
import { UserSettings } from '../../models/interfaces';
import SideNavigator from '../../components/SideNavigator/SideNavigator';
import FileLogger from '../../components/FileLogger';
import CreateFolder from '../../components/Modals/CreateFolder';

interface NewXCloudProps {
  user: UserSettings | any,
  isAuthenticated: boolean;
  isActivated: boolean;
  handleKeySaved: (user: JSON) => void;
  setHasConnection: (value: boolean) => void;
}

interface NewXCloudState {
  email: string;
  isAuthorized: boolean;
  isInitialized: boolean;
  isTeam: boolean;
  token: string;
  chooserModalOpen: boolean;
  rateLimitModal: boolean;
  currentFolderId: string;
  currentFolderBucket: string;
  currentCOmmanderItems: any[];
  namePath: any[];
  sortFunction: any;
  searchFunction: any;
  popupShareOpened: boolean,
  showDeleteItemsPopup: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isMember: boolean;
}

class NewXCloud extends React.Component<NewXCloudProps> {
  state = {
    email: '',
    isAuthorized: false,
    isInitialized: false,
    isTeam: false,
    token: '',
    chooserModalOpen: false,
    rateLimitModal: false,
    currentFolderId: null,
    currentFolderBucket: null,
    currentCommanderItems: [],
    namePath: [],
    sortFunction: null,
    searchFunction: null,
    popupShareOpened: false,
    showDeleteItemsPopup: false,
    isLoading: true,
    isAdmin: true,
    isMember: false
  };

  moveEvent = {};

  componentDidMount = () => {
    window.addEventListener('offline', () => {
      this.props.setHasConnection(false);
    });
    window.addEventListener('online', () => {
      this.props.setHasConnection(true);
    });

    if (isMobile) {
      if (isAndroid) {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.internxt.cloud';
      } else if (isIOS) {
        window.location.href = 'https://apps.apple.com/us/app/internxt-drive-secure-file-storage/id1465869889';
      }
    }

    // When user is not signed in, redirect to login
    if (!this.props.user || !this.props.isAuthenticated) {
      history.push('/login');
    } else {
      if (!this.props.user.root_folder_id) {
        // Initialize user in case that is not done yet
        this.userInitialization().then((resultId) => {
          console.log('getFolderContent 3');
          this.getFolderContent(resultId);
        }).catch((error) => {
          const errorMsg = error ? error : '';

          toast.warn('User initialization error ' + errorMsg);
          history.push('/login');
        });
      } else {
        console.log('getFolderContent 4');
        storeTeamsInfo().finally(() => {
          if (localStorageService.exists('xTeam') && !this.state.isTeam && localStorageService.get('workspace') === 'teams') {
            this.handleChangeWorkspace();
          } else {
            this.getFolderContent(this.props.user.root_folder_id);
            this.setState({ currentFolderId: this.props.user.root_folder_id });
          }
          const team: any = localStorageService.getTeams();

          if (team && !team.root_folder_id) {
            this.setState({ currentFolderId: this.props.user.root_folder_id });
          }

          this.setState({ isInitialized: true });
        }).catch(() => {
          localStorageService.del('xTeam');
          this.setState({
            isTeam: false
          });
        });
      }

    }
  };

  handleChangeWorkspace = () => {
    const xTeam: any = localStorageService.getTeams();
    const xUser: any = localStorageService.getUser();

    if (!localStorageService.exists('xTeam')) {
      toast.warn('You cannot access the team');
      this.setState({
        isTeam: false
      });
    }

    if (this.state.isTeam) {
      this.setState({ namePath: [{ name: 'All files', id: xUser.root_folder_id }] }, () => {
        this.getFolderContent(xUser.root_folder_id, false, true, false);
      });
    } else {
      this.setState({ namePath: [{ name: 'All files', id: xTeam.root_folder_id }] }, () => {
        this.getFolderContent(xTeam.root_folder_id, false, true, true);
      });
    }

    const isTeam = !this.state.isTeam;

    this.setState({ isTeam: isTeam }, () => {
      localStorageService.set('workspace', isTeam ? 'teams' : 'individual');
    });
  }

  userInitialization = () => {
    return new Promise((resolve, reject) => {
      fetch('/api/initialize', {
        method: 'post',
        headers: getHeaders(true, true),
        body: JSON.stringify({
          email: this.props.user.email,
          mnemonic: localStorageService.get('xMnemonic')
        })
      }).then((response) => {
        if (response.status === 200) {
          // Successfull intialization
          this.setState({ isInitialized: true });
          // Set user with new root folder id
          response.json().then((body) => {
            const updatedUser = this.props.user;

            updatedUser.root_folder_id = body.user.root_folder_id;
            this.props.handleKeySaved(updatedUser);
            resolve(body.user.root_folder_id);
          });
        } else {
          reject(null);
        }
      }).then(folderId => {
        console.log('getFolderContent 7');
        this.getFolderContent(folderId);
      })
        .catch((error) => {
          reject(error);
        });
    });
  };

  isUserActivated = () => {
    return fetch('/api/user/isactivated', {
      method: 'get',
      headers: getHeaders(true, false)
    }).then((response) => response.json())
      .catch(() => {
        console.log('Error getting user activation');
      });
  };

  isTeamActivated = () => {
    const team: any = localStorage.getTeams();

    return fetch(`/api/team/isactivated/${team.bridge_user}`, {
      method: 'get',
      headers: getHeaders(true, false)
    }).then((response) => response.json())
      .catch(() => {
        console.log('Error getting user activation');
      });
  }

  getTeamByUser = () => {
    return new Promise((resolve, reject) => {
      const user: any = localStorageService.getUser();

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

  setSortFunction = (newSortFunc) => {
    // Set new sort function on state and call getFolderContent for refresh files list
    this.setState({ sortFunction: newSortFunc });
    console.log('getFolderContent 8');
    this.getFolderContent(this.state.currentFolderId, false, true);
  };

  setSearchFunction = (e) => {
    const searchString = removeAccents(e.target.value.toString()).toLowerCase();
    let func: ((item: any) => void) | null = null;

    if (searchString) {
      func = function (item) {
        return item.name.toLowerCase().includes(searchString);
      };
    }

    this.setState({ searchFunction: func });
    console.log('getFolderContent 9');
    this.getFolderContent(this.state.currentFolderId, false, true, this.state.isTeam);
  };

  createFolder = () => {
    const folderName = prompt('Please enter folder name');

    if (folderName && folderName !== '') {
      fetch('/api/storage/folder', {
        method: 'post',
        headers: getHeaders(true, true, this.state.isTeam),
        body: JSON.stringify({
          parentFolderId: this.state.currentFolderId,
          folderName,
          teamId: _.last(this.state.namePath) && _.last(this.state.namePath).hasOwnProperty('id_team') ? _.last(this.state.namePath).id_team : null
        })
      }).then(async (res) => {
        if (res.status !== 201) {
          const body = await res.json();

          throw body.error ? body.error : 'createFolder error';
        }
        window.analytics.track('folder-created', {
          email: getUserData().email,
          platform: 'web'
        });
        console.log('getFolderContent 10');
        this.getFolderContent(this.state.currentFolderId, false, true, this.state.isTeam);
      }).catch((err) => {
        if (err.includes('already exists')) {
          toast.warn('Folder with same name already exists');
        } else {
          toast.warn(`"${err}"`);
        }
      });
    } else {
      toast.warn('Invalid folder name');
    }
  };

  folderNameExists = (folderName) => {
    return this.state.currentCommanderItems.find(
      (item: any) => item.isFolder && item.name === folderName
    );
  };

  fileNameExists = (fileName, type) => {
    return this.state.currentCommanderItems.some(
      (item: any) => !item.isFolder && item.name === fileName && item.type === type
    );
  };

  getNextNewName = (originalName, i) => `${originalName} (${i})`;

  getNewFolderName = (name) => {
    let exists = false;

    let i = 1;
    const currentFolder = this.state.currentCommanderItems.filter((item: any) => item.isFolder);

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
    const currentFiles = this.state.currentCommanderItems.filter((item: any) => !item.isFolder);

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
      const __currentCommanderItems: any[] = this.state.currentCommanderItems;

      if (this.folderNameExists(newFolderName)) {
        newFolderName = this.getNewName(newFolderName);
      }

      __currentCommanderItems.push({
        name: newFolderName,
        isLoading: true,
        isFolder: true
      });

      this.setState({ currentCommanderItems: __currentCommanderItems });
    } else {
      newFolderName = this.getNewName(newFolderName);
    }

    parentFolderId = parentFolderId || this.state.currentFolderId;

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
      console.log('getFolderContent 11');
      this.getFolderContent(e, true, true, this.state.isTeam);
      resolve();
    });
  };

  getFolderContent = async (rootId, updateNamePath = true, showLoading = true, isTeam = false): Promise<any> => {
    await new Promise((resolve) => this.setState({ isLoading: showLoading }, () => resolve()));

    const welcomeFile = await fetch('/api/welcome', {
      method: 'get',
      headers: getHeaders(true, false, isTeam)
    }).then(res => res.json())
      .then(body => body.file_exists)
      .catch(() => false);

    return fetch(`/api/storage/folder/${rootId}`, {
      method: 'get',
      headers: getHeaders(true, true, isTeam)
    }).then((res) => {
      if (res.status !== 200) {
        throw res;
      } else {
        return res.json();
      }
    }).then(async (data) => {
      this.deselectAll();

      // Set new items list
      let newCommanderFolders = _.map(data.children, (o) =>
        _.extend({ isFolder: true, isSelected: false, isLoading: false, isDowloading: false }, o)
      );

      let newCommanderFiles = data.files;

      // Apply search function if is set
      if (this.state.searchFunction) {
        newCommanderFolders = newCommanderFolders.filter(this.state.searchFunction);
        newCommanderFiles = newCommanderFiles.filter(this.state.searchFunction);
      }

      // Apply sort function if is set
      if (this.state.sortFunction) {
        newCommanderFolders.sort(this.state.sortFunction);
        newCommanderFiles.sort(this.state.sortFunction);
      }

      if (!data.parentId && welcomeFile) {
        newCommanderFiles = _.concat([{
          id: 0,
          file_id: '0',
          fileId: '0',
          name: 'Welcome',
          type: 'pdf',
          size: 0,
          isDraggable: false,
          get onClick() {
            return () => {
              window.analytics.track('file-welcome-open');
              return fetch('/Internxt.pdf').then(res => res.blob()).then(obj => {
                fileDownload(obj, 'Welcome.pdf');
              });
            };
          },
          onDelete: async () => {
            window.analytics.track('file-welcome-delete');
            return fetch('/api/welcome', {
              method: 'delete',
              headers: getHeaders(true, false, isTeam)
            }).catch(err => {
              console.error('Cannot delete welcome file, reason: %s', err.message);
            });
          }
        }], newCommanderFiles);
      }

      this.setState({
        currentCommanderItems: _.concat(newCommanderFolders, newCommanderFiles),
        currentFolderId: data.id,
        currentFolderBucket: data.bucket,
        isLoading: false
      });

      if (updateNamePath) {
        // Only push path if it is not the same as actual path
        if (
          this.state.namePath.length === 0 ||
          this.state.namePath[this.state.namePath.length - 1].id !== data.id
        ) {
          let folderName = '';

          folderName = this.props.user.root_folder_id === data.id ? 'All Files' : data.name;

          this.setState({
            namePath: this.pushNamePath({
              name: folderName,
              id: data.id,
              bucket: data.bucket,
              id_team: data.id_team
            }),
            isAuthorized: true
          });
        }
      }
    })
      .catch((err) => {
        if (err.status === 401) {
          localStorageService.clear();
          history.push('/login');
        }
      });
  };

  updateMeta = (metadata, itemId, isFolder) => {
    // Apply changes on metadata depending on type of item
    const data = JSON.stringify({ metadata });

    if (isFolder) {
      fetch(`/api/storage/folder/${itemId}/meta`, {
        method: 'post',
        headers: getHeaders(true, true, this.state.isTeam),
        body: data
      })
        .then(() => {
          window.analytics.track('folder-rename', {
            email: getUserData().email,
            fileId: itemId,
            platform: 'web'
          });
          console.log('getFolderContent 12');
          this.getFolderContent(this.state.currentFolderId, false, true, this.state.isTeam);
        })
        .catch((error) => {
          console.log(`Error during folder customization. Error: ${error} `);
        });
    } else {
      fetch(`/api/storage/file/${itemId}/meta`, {
        method: 'post',
        headers: getHeaders(true, true, this.state.isTeam),
        body: data
      })
        .then(() => {
          window.analytics.track('file-rename', {
            file_id: itemId,
            email: getUserData().email,
            platform: 'web'
          });
          console.log('getFolderContent 13');
          this.getFolderContent(this.state.currentFolderId, false, true, this.state.isTeam);
        })
        .catch((error) => {
          console.log(`Error during file customization. Error: ${error} `);
        });
    }
  };

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
          window.analytics.track(`${keyOp}-move`.toLowerCase(), {
            file_id: response.item.id,
            email: getUserData().email,
            platform: 'web'
          });
          // Remove myself
          const currentCommanderItems = this.state.currentCommanderItems.filter((commanderItem: any) =>
            item.isFolder
              ? !commanderItem.isFolder ||
              (commanderItem.isFolder && !(commanderItem.id === item.id))
              : commanderItem.isFolder ||
              (!commanderItem.isFolder && !(commanderItem.fileId === item.fileId))
          );
          // update state for updating commander items list

          this.setState({ currentCommanderItems });
        }

        if (moveEvent.total === 0) {
          this.clearMoveOpEvent(moveOpId);
          // If empty folder list move back
          if (!this.state.currentCommanderItems.length) {
            this.folderTraverseUp();
          }
        }
      });
    });
  };

  trackFileDownloadStart = (file_id, file_name, file_size, file_type, folder_id) => {
    const email = getUserData().email;
    const data = { file_id, file_name, file_size, file_type, email, folder_id, platform: 'web' };

    window.analytics.track('file-download-start', data);
  }

  trackFileDownloadError = (file_id, msg) => {
    const email = getUserData().email;
    const data = { file_id, email, msg, platform: 'web' };

    window.analytics.track('file-download-error', data);
  }

  trackFileDownloadFinished = (file_id, file_size) => {
    const email = getUserData().email;
    const data = { file_id, file_size, email, platform: 'web' };

    window.analytics.track('file-download-finished', data);
  }

  downloadFile = async (id, _class, pcb) => {
    const fileId = pcb.props.rawItem.fileId;
    const fileName = pcb.props.rawItem.name;
    const fileSize = pcb.props.rawItem.size;
    const folderId = pcb.props.rawItem.folder_id;
    const fileType = pcb.props.type;

    const completeFilename = fileType ? `${fileName}.${fileType}` : `${fileName}`;

    try {
      this.trackFileDownloadStart(fileId, fileName, fileSize, fileType, folderId);

      const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(this.state.isTeam);
      const network = new Network(bridgeUser, bridgePass, encryptionKey);

      const fileBlob = await network.downloadFile(bucketId, fileId, {
        progressCallback: (progress) => pcb.setState({ progress })
      });

      fileDownload(fileBlob, completeFilename);

      this.trackFileDownloadFinished(id, fileSize);
    } catch (err) {
      this.trackFileDownloadError(fileId, err.message);

      toast.warn(`Error downloading file: \n Reason is ${err.message} \n File id: ${fileId}`);
    } finally {
      pcb.setState({ progress: 0 });
    }
  };

  openUploadFile = () => {
    $('input#uploadFileControl').val(null);
    $('input#uploadFileControl').trigger('click');
  };

  trackFileUploadStart = (file, parentFolderId) => {
    window.analytics.track('file-upload-start', {
      file_size: file.size,
      file_type: file.type,
      folder_id: parentFolderId,
      email: getUserData().email,
      platform: 'web'
    });
  }

  trackFileUploadFinished = (file) => {
    console.log('file', file);
    window.analytics.track('file-upload-finished', {
      email: getUserData().email,
      file_size: file.size,
      file_type: file.type,
      file_id: file.id
    });
  }

  trackFileUploadError = (file, parentFolderId, msg) => {
    window.analytics.track('file-upload-error', {
      file_size: file.size,
      file_type: file.type,
      folder_id: parentFolderId,
      email: getUserData().email,
      msg,
      platform: 'web'
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
          email: getUserData().email,
          platform: 'web'
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
    const currentFolderId = this.state.currentFolderId;

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
        this.setState({ currentCommanderItems: [...this.state.currentCommanderItems, file] });

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
              const index = this.state.currentCommanderItems.findIndex((obj: any) => obj.name === file.name);
              const filesInFileExplorer: any[] = [...this.state.currentCommanderItems];

              filesInFileExplorer[index].isLoading = false;
              filesInFileExplorer[index].fileId = data.fileId;
              filesInFileExplorer[index].id = data.id;

              this.setState({ currentCommanderItems: filesInFileExplorer });
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
    const index = this.state.currentCommanderItems.findIndex((obj: any) => obj.name === filename);

    if (index === -1) {
      // prevent undesired removals
      return;
    }

    console.log(this.state.currentCommanderItems);

    this.setState({ currentCommanderItems: Array.from(this.state.currentCommanderItems).splice(index, 1) });
  }

  uploadFile = (e) => {
    this.handleUploadFiles(e.target.files, undefined, undefined).then(() => {
      this.getFolderContent(this.state.currentFolderId, false, false, this.state.isTeam);
    });
  }

  uploadDroppedFile = (e, uuid, folderPath) => {
    return this.handleUploadFiles(e, uuid, folderPath);
  }

  shareItem = () => {
    const selectedItems = this.getSelectedItems();

    if (selectedItems && selectedItems.length === 1) {
      this.setState({ popupShareOpened: true });
    } else {
      toast.warn('Please select at least one file or folder to share');
    }
  };

  deleteItems = () => {
    if (this.getSelectedItems().length > 0) {
      this.setState({ showDeleteItemsPopup: true });
    } else {
      toast.warn('Please select at least one file or folder to delete');
    }
  };

  confirmDeleteItems = () => {
    const selectedItems = this.getSelectedItems();

    //const bucket = _.last(this.state.namePath).bucket;
    const fetchOptions = {
      method: 'DELETE',
      headers: getHeaders(true, false, this.state.isTeam)
    };

    if (selectedItems.length === 0) {
      return;
    }
    const deletionRequests = _.map(selectedItems, (v, i) => {
      if (v.onDelete) {
        return (next) => {
          v.onDelete(); next();
        };
      }
      const url = v.isFolder
        ? `/api/storage/folder/${v.id}`
        : `/api/storage/folder/${v.folderId}/file/${v.id}`;

      return (next) =>
        fetch(url, fetchOptions).then(() => {
          window.analytics.track((v.isFolder ? 'folder' : 'file') + '-delete', {
            email: getUserData().email,
            platform: 'web'
          });
          next();
        }).catch(next);
    });

    async.parallel(deletionRequests, (err, result) => {
      if (err) {
        throw err;
      } else {
        console.log('getFolderContent 16');
        this.getFolderContent(this.state.currentFolderId, false, true, this.state.isTeam);
      }
    });
  };

  selectItems = (items, isFolder, unselectOthers = true) => {
    if (typeof items === 'number') {
      items = [items];
    }

    this.state.currentCommanderItems.forEach((item: any) => {
      const isTargetItem = items.indexOf(item.id) !== -1 && item.isFolder === isFolder;

      if (isTargetItem) {
        item.isSelected = !item.isSelected;
      } else {
        if (unselectOthers) {
          item.isSelected = false;
        } else {
          item.isSelected = !!item.isSelected;
        }
      }
    });

    this.setState({ currentCommanderItems: this.state.currentCommanderItems });
  };

  deselectAll() {
    this.state.currentCommanderItems.forEach((item: any) => {
      item.isSelected = false;
    });
    this.setState({ currentCommanderItems: this.state.currentCommanderItems });
  }

  getSelectedItems() {
    return this.state.currentCommanderItems.filter((o: any) => o.isSelected === true);
  }

  folderTraverseUp() {
    this.setState(this.popNamePath(), () => {
      this.getFolderContent(_.last(this.state.namePath).id, false, true, this.state.isTeam);
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

  openChooserModal() {
    this.setState({ chooserModalOpen: true });
  }

  closeModal = () => {
    this.setState({ chooserModalOpen: false });
  };

  closeRateLimitModal = () => {
    this.setState({ rateLimitModal: false });
  };

  goToStorage = () => {
    history.push('/storage');
  };

  showTeamSettings = () => {
    history.push('/teams/settings');
  }

  render() {
    if (this.props.isAuthenticated && this.state.isInitialized) {
      return (
        <div className="relative xcloud-layout flex">
          <CreateFolder />

          <SideNavigator />

          <div className="flex-grow bg-l-neutral-10 px-32px">
            <AppHeader />
            <FileView />
          </div>

          <FileLogger />
          <FileActivity />
        </div>
      );
    } else {
      if (!this.props.isAuthenticated) {
        return (
          <div className="App">
            <h2>
              Please <Link to="/login">login</Link> into your Internxt Drive account
            </h2>
          </div>
        );
      }
      // If is waiting for async method return blank page
      return <div></div>;
    }
  }
}

export default connect(null, { setHasConnection })(NewXCloud);