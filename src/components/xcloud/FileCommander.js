// import * as _ from 'lodash'
import * as React from 'react';
import { Dropdown, Button, ButtonGroup } from 'react-bootstrap';
import async from 'async';
import $ from 'jquery'

import './FileCommander.scss';
import FileCommanderItem from './FileCommanderItem';
import DropdownArrowIcon from '../../assets/Dashboard-Icons/Dropdown arrow.svg';
import BackToIcon from '../../assets/Dashboard-Icons/back-arrow.svg';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SORT_TYPES = {
  DATE_ADDED: 'Date_Added',
  SIZE_ASC: 'Size_Asc',
  SIZE_DESC: 'Size_Desc',
  NAME_ASC: 'Name_Asc',
  NAME_DESC: 'Name_Desc',
  FILETYPE_ASC: 'File_Type_Asc',
  FILETYPE_DESC: 'File_Type_Asc',
};

class FileCommander extends React.Component {
  constructor(props, state) {
    super(props, state);
    this.state = {
      currentCommanderItems: this.props.currentCommanderItems,
      namePath: this.props.namePath,
      selectedSortType: SORT_TYPES.DATE_ADDED,
      dragDropStyle: '',
      treeSize: 0,
    };
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.currentCommanderItems !== prevProps.currentCommanderItems ||
      this.props.namePath !== prevProps.namePath
    ) {
      this.setState({
        currentCommanderItems: this.props.currentCommanderItems,
        namePath: this.props.namePath,
      });
    }
  }

  sortItems = (sortType) => {
    // Sort commander file items depending on option selected
    let sortFunc = null;
    switch (sortType) {
      case SORT_TYPES.DATE_ADDED:
        // At this time, default order is date added
        break;
      case SORT_TYPES.FILETYPE_ASC:
        sortFunc = function (a, b) {
          return a.type.localeCompare(b.type);
        };
        break;
      case SORT_TYPES.FILETYPE_DESC:
        sortFunc = function (a, b) {
          return b.type.localeCompare(a.type);
        };
        break;
      case SORT_TYPES.NAME_ASC:
        sortFunc = function (a, b) {
          return a.name.localeCompare(b.name);
        };
        break;
      case SORT_TYPES.NAME_DESC:
        sortFunc = function (a, b) {
          return b.name.localeCompare(a.name);
        };
        break;
      case SORT_TYPES.SIZE_ASC:
        sortFunc = function (a, b) {
          return a.size - b.size;
        };
        break;
      case SORT_TYPES.SIZE_DESC:
        sortFunc = function (a, b) {
          return a.size - b.size;
        };
        break;
      default:
        break;
    }
    this.props.setSortFunction(sortFunc);
  };

  onSelect = (eventKey, event) => {
    // Change active class to option selected only if its not the currently active
    if (!event.target.className.includes('active')) {
      document.getElementById(this.state.selectedSortType).className = document
        .getElementById(this.state.selectedSortType)
        .className.split(' ')[0];
      event.target.className = event.target.className + ' active';
      this.setState({ selectedSortType: event.target.id });
    }
  };

  getEventDatasetData = (item) => {
    if (item.isfolder === 'true') {
      return {
        id: parseInt(item.cloudFileId),
        isFolder: true,
        type: 'folder',
        name: item.name,
      };
    }

    return {
      fileId: item.bridgeFileId,
      isFolder: false,
      type: item.type,
      name: item.name,
    };
  };

  handleDragStart = (event) => {
    const currentItemEvent = this.getEventDatasetData(event.currentTarget.dataset);
    // Add selected items to event data (for moving)
    const selectedItems = this.state.currentCommanderItems.filter(
      (item) =>
        item.isSelected && item.fileId !== currentItemEvent.id && item.id !== currentItemEvent.id,
    );
    let data = selectedItems.map((item) => {
      return item;
    });
    // Do not forget current drag item (even if it's or not selected, we move it)
    data.push(currentItemEvent);
    event.dataTransfer.setData('text/plain', JSON.stringify(data));
  };

  handleDragOver = (e) => {
    // Disable drop files for fileCommander files
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      $('#FileCommander-items').addClass('drag-over')
    }
  };

  handleDragOverBackButton = (event) => {
    // Determine parent folder
    var parentFolder =
      this.state.namePath[this.state.namePath.length - 2] &&
      this.state.namePath[this.state.namePath.length - 2].id; // Get the MySQL ID of parent folder

    // Allow only drop files into back button if is not parent folder
    if (parentFolder && event.dataTransfer.types && event.dataTransfer.types[0] === 'text/plain') {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  handleDropOverBackButton = (event) => {
    event.preventDefault();
    // Determine parent folder
    var parentFolder =
      this.state.namePath[this.state.namePath.length - 2] &&
      this.state.namePath[this.state.namePath.length - 2].id; // Get the MySQL ID of parent folder

    // Recover data from the original object that has been dragged
    var data = JSON.parse(event.dataTransfer.getData('text/plain'));

    if (parentFolder) {
      const moveOpId = new Date().getTime();
      this.props.move(data, parentFolder, moveOpId);
    }
  };

  handleDragLeave = (e) => {
    $('#FileCommander-items').removeClass('drag-over')
  };

  isAcceptableSize = (size) => {
    return parseInt(size) <= 209715200 ? true : false;
  };

  handleDrop = (e, parentId = null) => {
    e.preventDefault();
    let items = e.dataTransfer.items;

    async.map(
      items,
      (item, nextItem) => {
        let entry = item ? item.webkitGetAsEntry() : null;
        if (entry) {
          this.getTotalTreeSize(entry)
            .then(() => {
              if (this.isAcceptableSize(this.state.treeSize)) {
                this.traverseFileTree(entry, '', parentId)
                  .then(() => {
                    nextItem();
                  })
                  .catch((err) => {
                    nextItem(err);
                  });
              } else {
                toast.warn(
                  `File too large.\nYou can only upload or download files of up to 200 MB through the web app`,
                );
              }
            })
            .catch((err) => { });
        } else {
          nextItem();
        }
      },
      (err) => {
        if (err) {
          let errmsg = err.error ? err.error : err;
          if (errmsg.includes('already exist')) {
            errmsg = 'Folder with same name already exists';
          }
          toast.warn(`"${errmsg}"`);
        }

        this.props.getFolderContent(this.props.currentFolderId);
      },
    );

    e.stopPropagation();
    $('#FileCommander-items').removeClass('drag-over')
  };

  setTreeSize = (newSize) => {
    return new Promise((resolve, reject) => {
      this.setState({ treeSize: newSize });
      resolve(true);
    });
  };

  getTotalTreeSize = (item, resetCountSize = true) => {
    return new Promise((resolve, reject) => {
      if (item.isFile) {
        item.file((file) => {
          if (resetCountSize) {
            this.setState({ treeSize: 0 });
          }

          this.setTreeSize(this.state.treeSize + file.size)
            .then(() => {
              resolve(this.state.treeSize);
            })
            .catch(() => { });
        });
      } else if (item.isDirectory) {
        let dirReader = item.createReader();

        dirReader.readEntries((entries) => {
          async.eachSeries(
            entries,
            (entry, nextEntry) => {
              this.getTotalTreeSize(entry, false)
                .then(() => nextEntry())
                .catch(nextEntry);
            },
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            },
          );
        });
      }
    });
  };

  traverseFileTree = (item, path = '', uuid = null) => {
    return new Promise((resolve, reject) => {
      if (item.isFile) {
        // Get file
        item.file((file) => {
          this.props.uploadDroppedFile([file], uuid).then(resolve).catch(reject);
        });
      } else if (item.isDirectory) {
        this.props
          .createFolderByName(item.name, uuid)
          .then((data) => {
            let folderParent = data.id;
            let dirReader = item.createReader();

            dirReader.readEntries((entries) => {
              async.eachSeries(
                entries,
                (entry, nextEntry) => {
                  this.traverseFileTree(entry, path + item.name + '/', folderParent)
                    .then(() => nextEntry())
                    .catch(nextEntry);
                },
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                },
              );
            });
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  };

  render() {
    const list = this.state.currentCommanderItems || 0;
    const inRoot = this.state.namePath.length === 1;

    return (
      <div id="FileCommander">
        <div id="FileCommander-info">
          {
            <div
              id="FileCommander-backTo">
              {this.state.namePath.length > 1 ? (
                <span
                  onClick={this.props.handleFolderTraverseUp.bind(this)}
                  onDragOver={this.handleDragOverBackButton}
                  onDrop={this.handleDropOverBackButton}>
                  <img src={BackToIcon} alt="Back" />{' '}
                  {this.state.namePath[this.state.namePath.length - 2].name}
                </span>
              ) : (
                  ''
                )}
            </div>
          }
          {
            <div id="FileCommander-path">
              <Dropdown className="dropdownButton">
                <Dropdown.Toggle>
                  {this.state.namePath.length > 1
                    ? this.state.namePath[this.state.namePath.length - 1].name
                    : 'All Files'}
                  <img src={DropdownArrowIcon} alt="Dropdown" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item
                    id={SORT_TYPES.DATE_ADDED}
                    onClick={() => this.sortItems(SORT_TYPES.DATE_ADDED)}
                    onSelect={this.onSelect}
                    active
                  >
                    Date Added
                  </Dropdown.Item>
                  <Dropdown.Item
                    id={SORT_TYPES.SIZE_ASC}
                    onClick={() => this.sortItems(SORT_TYPES.SIZE_ASC)}
                    onSelect={this.onSelect}
                  >
                    Size
                  </Dropdown.Item>
                  <Dropdown.Item
                    id={SORT_TYPES.NAME_ASC}
                    onClick={() => this.sortItems(SORT_TYPES.NAME_ASC)}
                    onSelect={this.onSelect}
                  >
                    Name
                  </Dropdown.Item>
                  <Dropdown.Item
                    id={SORT_TYPES.FILETYPE_ASC}
                    onClick={() => this.sortItems(SORT_TYPES.FILETYPE_ASC)}
                    onSelect={this.onSelect}
                  >
                    File Type
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          }
          {
            <div>
              {/*
              <ButtonGroup className="switch-view">
                <Button onClick={() => {
                  if ($('#FileCommander-items').hasClass('list')) {
                    $('#FileCommander-items').removeClass('list')
                    $('#FileCommander-items').addClass('mosaico')
                  }
                }} variant="light"><i class="fa fa-th fa-lg"></i></Button>
                <Button onClick={() => {
                  if ($('#FileCommander-items').hasClass('mosaico')) {
                    $('#FileCommander-items').removeClass('mosaico')
                    $('#FileCommander-items').addClass('list')
                  }
                }} variant="light"><i class="fa fa-list fa-lg"></i></Button>
              </ButtonGroup>
              */}
            </div>
          }
        </div>
        <div
          id="FileCommander-items"
          className="mosaico"
          onDragOver={this.handleDragOver}
          onDragLeave={this.handleDragLeave}
          onDrop={this.handleDrop}
        >
          {list.length > 0 ? (
            list.map((item, i) => {
              return (
                <FileCommanderItem
                  key={item.id + '' + i}
                  selectableKey={item.id}
                  ref={this.myRef}
                  id={item.id}
                  rawItem={item}
                  name={item.name}
                  type={item.type}
                  size={item.size}
                  bucket={item.bucket}
                  created={item.created_at}
                  icon={item.icon}
                  color={item.color ? item.color : 'blue'}
                  clickHandler={
                    item.isFolder
                      ? this.props.openFolder.bind(null, item.id)
                      : this.props.downloadFile.bind(null, item.fileId)
                  }
                  selectHandler={this.props.selectItems}
                  isLoading={!!item.isLoading}
                  isDownloading={!!item.isDownloading}
                  move={this.props.move}
                  updateMeta={this.props.updateMeta}
                  hasParentFolder={!inRoot}
                  isFolder={item.isFolder}
                  isSelected={item.isSelected}
                  handleExternalDrop={this.handleDrop}
                  handleDragStart={this.handleDragStart}
                />
              );
            })
          ) : inRoot ? (
            <div className="noItems">
              <h1>Your Internxt Drive is empty.</h1>
              <h4 className="noItems-subtext">
                Click the upload button or drop files in this window to get started.
              </h4>
            </div>
          ) : (
                <div className="noItems">
                  <h1>This folder is empty.</h1>
                </div>
              )}
        </div>
      </div>
    );
  }
}

export default FileCommander;
