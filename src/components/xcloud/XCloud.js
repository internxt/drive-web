import * as React from 'react';
import { Link } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import $ from 'jquery';
import _ from 'lodash';
import fileDownload from 'js-file-download';
import update from 'immutability-helper';
import Popup from 'reactjs-popup';
import async from 'async';

import FileCommander from './FileCommander';
import NavigationBar from '../navigationBar/NavigationBar';
import history from '../../lib/history';
import { removeAccents } from '../../lib/utils';
import closeTab from '../../assets/Dashboard-Icons/close-tab.svg';

import PopupShare from '../PopupShare';
import './XCloud.scss';

import { getHeaders } from '../../lib/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import axios from 'axios'

import { getUserData } from '../../lib/analytics'
import Settings from '../../lib/settings';

class XCloud extends React.Component {

  state = {
    email: '',
    isAuthorized: false,
    isInitialized: false,
    isActivated: false,
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
  };

  moveEvent = {};

  componentDidMount = () => {
    // When user is not signed in, redirect to login
    if (!this.props.user || !this.props.isAuthenticated) {
      history.push('/login');
    } else {
      this.getFolderContent(this.props.user.root_folder_id);
      this.setState({ isActivated: true, isInitialized: true });

    }
  };

  isUserActivated = () => {
    return fetch('/api/user/isactivated', {
      method: 'get',
      headers: getHeaders(true, false),
    }).then((response) => response.json())
      .catch(() => {
        console.log('Error getting user activation');
      });
  };

  setSortFunction = (newSortFunc) => {
    // Set new sort function on state and call getFolderContent for refresh files list
    this.setState({ sortFunction: newSortFunc });
    this.getFolderContent(this.state.currentFolderId);
  };

  setSearchFunction = (e) => {
    // Set search function depending on search text input and refresh items list
    const searchString = removeAccents(e.target.value.toString()).toLowerCase();
    let func = null;
    if (searchString) {
      func = function (item) {
        return item.name.toLowerCase().includes(searchString);
      };
    }
    this.setState({ searchFunction: func });
    this.getFolderContent(this.state.currentFolderId);
  };

  createFolder = () => {
    const folderName = prompt('Please enter folder name');
    if (folderName && folderName !== '') {
      fetch(`/api/storage/folder`, {
        method: 'post',
        headers: getHeaders(true, true),
        body: JSON.stringify({
          parentFolderId: this.state.currentFolderId,
          folderName,
        }),
      }).then(async (res) => {
        if (res.status !== 201) {
          const body = await res.json();
          throw body.error ? body.error : 'createFolder error';
        }
        window.analytics.track('folder-created', {
          email: getUserData().email,
          platform: 'web'
        })
        this.getFolderContent(this.state.currentFolderId, false);
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
      (item) => item.isFolder && item.name === folderName,
    );
  };

  fileNameExists = (fileName, type) => {
    return this.state.currentCommanderItems.find(
      (item) => !item.isFolder && item.name === fileName && item.type === type,
    );
  };

  getNextNewName = (originalName, i) => `${originalName} (${i})`;

  getNewFolderName = (name) => {
    let exists = true;
    let i = 1;
    const currentFolder = this.state.currentCommanderItems.filter((item) => item.isFolder);
    let finalName;
    while (exists) {
      const newName = this.getNextNewName(name, i);
      exists = currentFolder.find((folder) => folder.name === newName);
      i += 1;
      finalName = newName
    }

    return finalName;
  };

  getNewFileName = (name, type) => {
    let exists = true;
    let i = 1;
    let finalName;
    const currentFiles = this.state.currentCommanderItems.filter((item) => !item.isFolder);
    while (exists) {
      const newName = this.getNextNewName(name, i);
      exists = currentFiles.find((file) => file.name === newName && file.type === type);
      finalName = newName
      i += 1;
    }

    return finalName;
  };

  getNewName = (name, type) => {
    // if has type is file
    if (type) {
      return this.getNewFileName(name, type);
    }

    return this.getNewFolderName(name);
  };

  createFolderByName = (folderName, parentFolderId) => {
    // No parent id implies is a directory created on the current folder, so let's show a spinner
    if (!parentFolderId) {
      let __currentCommanderItems;
      if (this.folderNameExists(folderName)) {
        folderName = this.getNewName(folderName);
      }
      __currentCommanderItems = this.state.currentCommanderItems;
      __currentCommanderItems.push({
        name: folderName,
        isLoading: true,
        isFolder: true,
      });

      this.setState({ currentCommanderItems: __currentCommanderItems });
    } else {
      folderName = this.getNewName(folderName);
    }

    parentFolderId = parentFolderId || this.state.currentFolderId;

    return new Promise((resolve, reject) => {
      fetch(`/api/storage/folder`, {
        method: 'post',
        headers: getHeaders(true, true),
        body: JSON.stringify({
          parentFolderId,
          folderName,
        }),
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

  openFolder = (e) => {
    return new Promise((resolve) => {
      this.getFolderContent(e);
      resolve();
    });
  };

  getFolderContent = async (rootId, updateNamePath = true) => {

    let welcomeFile = await fetch('/api/welcome', {
      method: 'get',
      headers: getHeaders(true, false)
    }).then(res => res.json())
      .then(body => body.file_exists)
      .catch(() => false)

    fetch(`/api/storage/folder/${rootId}`, {
      method: 'get',
      headers: getHeaders(true, true),
    })
      .then((res) => {
        if (res.status !== 200) {
          throw res;
        } else {
          return res.json();
        }
      })
      .then((data) => {
        this.deselectAll();

        // Set new items list
        let newCommanderFolders = _.map(data.children, (o) =>
          _.extend({ isFolder: true, isSelected: false, isLoading: false, isDowloading: false }, o),
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
            onClick: async () => {
              window.analytics.track('file-welcome-open');
              fetch('/Internxt.pdf').then(res => res.blob()).then(obj => {
                fileDownload(obj, 'Welcome.pdf')
              })
            },
            onDelete: async () => {
              window.analytics.track('file-welcome-delete');
              return fetch('/api/welcome', {
                method: 'delete',
                headers: getHeaders(true, false)
              }).catch(err => {
                console.error('Cannot delete welcome file, reason: %s', err.message)
              })
            }
          }], newCommanderFiles)
        }

        this.setState({
          currentCommanderItems: _.concat(newCommanderFolders, newCommanderFiles),
          currentFolderId: data.id,
          currentFolderBucket: data.bucket,
        });

        if (updateNamePath) {
          // Only push path if it is not the same as actual path
          if (
            this.state.namePath.length === 0 ||
            this.state.namePath[this.state.namePath.length - 1].id !== data.id
          ) {
            const folderName = this.props.user.root_folder_id === data.id ? 'All Files' : data.name;
            this.setState({
              namePath: this.pushNamePath({
                name: folderName,
                id: data.id,
                bucket: data.bucket,
              }),
              isAuthorized: true,
            });
          }
        }
      })
      .catch((err) => {
        if (err.status === 401) {
          Settings.clear();
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
        headers: getHeaders(true, true),
        body: data,
      })
        .then(() => {
          window.analytics.track('folder-rename', {
            email: getUserData().email,
            fileId: itemId,
            platform: 'web'
          })
          this.getFolderContent(this.state.currentFolderId);
        })
        .catch((error) => {
          console.log(`Error during folder customization. Error: ${error} `);
        });
    } else {
      fetch(`/api/storage/file/${itemId}/meta`, {
        method: 'post',
        headers: getHeaders(true, true),
        body: data,
      })
        .then(() => {
          window.analytics.track('file-rename', {
            file_id: itemId,
            email: getUserData().email,
            platform: 'web'
          })
          this.getFolderContent(this.state.currentFolderId);
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
      return toast.warn(`You can't move a folder inside itself'`);
    }

    // Init default operation properties
    if (!this.moveEvent[moveOpId]) {
      this.moveEvent[moveOpId] = {
        total: 0,
        errors: 0,
        resolved: 0,
        itemsLength: items.length,
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
        headers: getHeaders(true, true),
        body: JSON.stringify(data),
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
          })
          // Remove myself
          let currentCommanderItems = this.state.currentCommanderItems.filter((commanderItem) =>
            item.isFolder
              ? !commanderItem.isFolder ||
              (commanderItem.isFolder && !(commanderItem.id === item.id))
              : commanderItem.isFolder ||
              (!commanderItem.isFolder && !(commanderItem.fileId === item.fileId)),
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

  downloadFile = (id, _class, pcb) => {
    return new Promise((resolve) => {
      axios.interceptors.request.use((config) => {
        const headers = getHeaders(true, true)
        headers.forEach((value, key) => {
          config.headers[key] = value
        })
        return config
      })
      window.analytics.track('file-download-start', {
        file_id: pcb.props.rawItem.id,
        file_name: pcb.props.rawItem.name,
        file_size: pcb.props.rawItem.size,
        file_type: pcb.props.type,
        email: getUserData().email,
        folder_id: pcb.props.rawItem.folder_id,
        platform: 'web'
      })
      axios.get(`/api/storage/file/${id}`, {
        onDownloadProgress(pe) {
          if (pcb) {
            const size = pcb.props.rawItem.size
            const progress = Math.floor(100 * pe.loaded / size)
            pcb.setState({ progress: progress })
          }
        },
        responseType: 'blob'
      }).then(res => {
        if (res.status !== 200) {
          throw res
        }

        window.analytics.track('file-download-finished', {
          file_id: id,
          email: getUserData().email,
          file_size: res.data.size,
          platform: 'web'
        })
        return { blob: res.data, filename: Buffer.from(res.headers['x-file-name'], 'base64').toString('utf8') }
      }).then(({ blob, filename }) => {
        fileDownload(blob, filename);
        pcb.setState({ progress: 0 })
        resolve()
      }).catch(err => {
        window.analytics.track('file-download-error', {
          file_id: id,
          email: getUserData().email,
          msg: err.message,
          platform: 'web'
        });
        if (err.response && err.response.status === 401) {
          return history.push('/login')
        } else {
          err.response.data.text().then(result => {
            const json = JSON.parse(result)
            toast.warn(
              'Error downloading file:\n' +
              err.response.status +
              ' - ' +
              err.response.statusText +
              '\n' +
              json.message +
              '\nFile id: ' +
              id,
            );
          }).catch(textErr => {
            toast.warn(
              'Error downloading file:\n' +
              err.response.status +
              ' - ' +
              err.response.statusText +
              '\nFile id: ' +
              id,
            );
          })
        }
        resolve()
      })
    });
  };

  openUploadFile = () => {
    $('input#uploadFileControl').val(null);
    $('input#uploadFileControl').trigger('click');
  };

  upload = (file, parentFolderId) => {
    return new Promise((resolve, reject) => {
      if (!parentFolderId) {
        return reject(Error('No folder ID provided'));
      }

      window.analytics.track('file-upload-start', {
        file_size: file.size,
        file_type: file.type,
        folder_id: parentFolderId,
        email: getUserData().email,
        platform: 'web'
      })

      const uploadUrl = `/api/storage/folder/${parentFolderId}/upload`;

      // Headers with Auth & Mnemonic
      let headers = getHeaders(true, true);
      headers.delete('content-type');

      // Data
      const data = new FormData();
      data.append('xfile', file);

      fetch(uploadUrl, {
        method: 'POST',
        headers: headers,
        body: data,
      })
        .then(async (res) => {
          let data;
          try {
            data = await res.json();
            window.analytics.track('file-upload-finished', {
              email: getUserData().email,
              file_size: file.size,
              file_type: file.type,
              file_id: data.fileId
            })

          } catch (err) {
            console.log(err)
            window.analytics.track('file-upload-error', {
              file_size: file.size,
              file_type: file.type,
              email: getUserData().email,
              msg: err.message,
              platform: 'web'
            })
            console.error('Upload response data is not a JSON', err);
          }
          if (data) {
            return { res: res, data: data };
          } else {
            throw res;
          }
        })
        .then(({ res, data }) => resolve({ res, data }))
        .catch(reject);
    });
  };

  handleUploadFiles = (files, parentFolderId) => {
    files = Array.from(files);
    var re = /(?:\.([^.]+))?$/;
    let __currentCommanderItems = this.state.currentCommanderItems;
    let currentFolderId = this.state.currentFolderId;
    parentFolderId = parentFolderId || currentFolderId;

    for (let i = 0; i < files.length; i++) {
      if (files[i].size >= 314572800) {
        let arr = Array.from(files);
        arr.splice(i, 1);
        files = arr;
        toast.warn(
          `File too large.\nYou can only upload or download files of up to 300 MB through the web app`,
        );
      }
    }

    for (let i = 0; i < files.length; i++) {
      let newName;
      let fileAtt = re.exec(files[i].name);
      if (this.fileNameExists(files[i].name.replace(fileAtt[0], ''), fileAtt[1])) {
        newName = this.getNewName(files[i].name.replace(fileAtt[0], ''), fileAtt[1]);
        files[i].newName = newName;
      }
    }

    if (parentFolderId === currentFolderId) {
      const newCommanderItems = files.map((file) => {
        return { name: file.newName || file.name, size: file.size, isLoading: true };
      });
      __currentCommanderItems = __currentCommanderItems.concat(newCommanderItems);
      this.setState({ currentCommanderItems: __currentCommanderItems });
    }

    return new Promise((resolve, reject) => {
      async.eachSeries(
        files,
        (file, next) => {
          this.upload(file, parentFolderId)
            .then(({ res, data }) => {
              if (res.status === 402) {
                this.setState({ rateLimitModal: true });
                throw res.status;
              }

              if (res.status === 500) {
                throw data.message;
              }

              if (parentFolderId === currentFolderId) {
                let index = __currentCommanderItems.findIndex(
                  (obj) => obj.name === (file.newName || file.name),
                );
                __currentCommanderItems[index].isLoading = false;
                __currentCommanderItems[index].type = re.exec(file.name)[1];
                this.setState({ currentCommanderItems: __currentCommanderItems }, () => next());
              } else {
                next();
              }
            })
            .catch((err) => {
              let index = __currentCommanderItems.findIndex(
                (obj) => obj.name === (file.newName || file.name),
              );
              __currentCommanderItems.splice(index, 1);
              this.setState({ currentCommanderItems: __currentCommanderItems }, () => next(err));
            }).finally(() => {
              this.getFolderContent(this.state.currentFolderId)
            });
        },
        (err, results) => {
          if (err) {
            console.error('Error uploading:', err);
            reject(err);
            toast.warn(`"${err}"`);
          } else if (parentFolderId === currentFolderId) {
            resolve();
            this.getFolderContent(currentFolderId);
          } else {
            resolve();
          }
        },
      );
    });
  };

  uploadFile = (e) => this.handleUploadFiles(e.target.files);

  uploadDroppedFile = (e, uuid) => this.handleUploadFiles(e, uuid);

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
      headers: getHeaders(true, false),
    };

    if (selectedItems.length === 0) return;
    const deletionRequests = _.map(selectedItems, (v, i) => {
      if (v.onDelete) {
        return (next) => { v.onDelete(); next() }
      }
      const url = v.isFolder
        ? `/api/storage/folder/${v.id}`
        : `/api/storage/folder/${v.folderId}/file/${v.id}`;
      return (next) =>
        fetch(url, fetchOptions).then(() => {
          window.analytics.track((v.isFolder ? 'folder' : 'file') + '-delete', {
            email: getUserData().email,
            platform: 'web'
          })
          next()
        }).catch(next);
    });

    async.parallel(deletionRequests, (err, result) => {
      if (err) {
        throw err;
      } else {
        this.getFolderContent(this.state.currentFolderId, false);
      }
    });
  };

  selectItems = (items, isFolder, unselectOthers = true) => {
    if (typeof items === 'number') {
      items = [items];
    }

    this.state.currentCommanderItems.forEach((item) => {
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
    this.state.currentCommanderItems.forEach((item) => {
      item.isSelected = false;
    });
    this.setState({ currentCommanderItems: this.state.currentCommanderItems });
  }

  getSelectedItems() {
    return this.state.currentCommanderItems.filter((o) => o.isSelected === true);
  }

  folderTraverseUp() {
    this.setState(this.popNamePath(), () => {
      this.getFolderContent(_.last(this.state.namePath).id, false);
    });
  }

  pushNamePath(path) {
    return update(this.state.namePath, { $push: [path] });
  }

  popNamePath() {
    return (previousState, currentProps) => {
      return {
        ...previousState,
        namePath: _.dropRight(previousState.namePath),
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

  render() {
    // Check authentication
    if (this.props.isAuthenticated && this.state.isActivated && this.state.isInitialized) {
      return (
        <div className="App d-flex flex-column">
          <NavigationBar
            showFileButtons={true}
            showSettingsButton={true}
            createFolder={this.createFolder}
            uploadFile={this.openUploadFile}
            uploadHandler={this.uploadFile}
            deleteItems={this.deleteItems}
            setSearchFunction={this.setSearchFunction}
            shareItem={this.shareItem}
            style
          />

          <FileCommander
            currentCommanderItems={this.state.currentCommanderItems}
            openFolder={this.openFolder}
            downloadFile={this.downloadFile}
            selectItems={this.selectItems}
            namePath={this.state.namePath}
            handleFolderTraverseUp={this.folderTraverseUp.bind(this)}
            uploadDroppedFile={this.uploadDroppedFile}
            createFolderByName={this.createFolderByName}
            setSortFunction={this.setSortFunction}
            move={this.move}
            updateMeta={this.updateMeta}
            currentFolderId={this.state.currentFolderId}
            getFolderContent={this.getFolderContent}
          />

          {this.getSelectedItems().length > 0 && this.state.popupShareOpened ? (
            <PopupShare
              open={this.state.popupShareOpened}
              item={this.getSelectedItems()[0]}
              onClose={() => {
                this.setState({ popupShareOpened: false });
              }}
            />
          ) : (
              ''
            )}

          <Popup
            open={this.state.showDeleteItemsPopup}
            closeOnDocumentClick
            onClose={() => this.setState({ showDeleteItemsPopup: false })}
            className="popup--full-screen"
          >
            <div className="popup--full-screen__content">
              <div className="popup--full-screen__close-button-wrapper">
                <img
                  src={closeTab}
                  onClick={() => this.setState({ showDeleteItemsPopup: false })}
                  alt="Close tab"
                />
              </div>
              <div className="message-wrapper">
                <h1>Delete item{this.getSelectedItems().length > 1 ? 's' : ''}</h1>
                <h2>
                  Please confirm you want to delete this item
                  {this.getSelectedItems().length > 1 ? 's' : ''}. This action can’t be undone.
                </h2>
                <div className="buttons-wrapper">
                  <div
                    className="default-button button-primary"
                    onClick={() => {
                      this.confirmDeleteItems();
                      this.setState({ showDeleteItemsPopup: false });
                    }}
                  >
                    Confirm
                  </div>
                </div>
              </div>
            </div>
          </Popup>

          <Popup open={this.state.chooserModalOpen} closeOnDocumentClick onClose={this.closeModal}>
            <div>
              <a href={'xcloud://' + this.state.token + '://' + JSON.stringify(this.props.user)}>
                Open mobile app
              </a>
              <a href="/" onClick={this.closeModal}>
                Use web app
              </a>
            </div>
          </Popup>

          <Popup
            open={this.state.rateLimitModal}
            closeOnDocumentClick
            onClose={this.closeRateLimitModal}
            className="popup--full-screen"
          >
            <div className="popup--full-screen__content">
              <div className="popup--full-screen__close-button-wrapper">
                <img src={closeTab} onClick={this.closeRateLimitModal} alt="Close tab" />
              </div>
              <div className="message-wrapper">
                <h1> You have run out of storage. </h1>
                <h2>
                  In order to start uploading more files please click the button below to upgrade
                  your storage plan.
                </h2>
                <div className="buttons-wrapper">
                  <div className="default-button button-primary" onClick={this.goToStorage}>
                    Upgrade my storage plan
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </div>
      );
    } else {
      // Cases of access error
      // Not authenticated
      if (!this.props.isAuthenticated) {
        return (
          <div className="App">
            <h2>
              Please <Link to="/login">login</Link> into your Internxt Drive account
            </h2>
          </div>
        );
      }
      // User not activated
      if (this.state.isActivated === false) {
        return (
          <div className="App">
            <Alert variant="danger">
              <h3>Your account needs to be activated!</h3>
              <p> Search your mail inbox for activation mail and follow its instructions </p>
            </Alert>
          </div>
        );
      }
      // If is waiting for async method return blank page
      return <div></div>;
    }
  }
}

export default XCloud;
