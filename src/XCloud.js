import * as React from "react";
import { Link } from 'react-router-dom';
import $ from 'jquery';
import _ from 'lodash';
import fileDownload from 'js-file-download';

import Header from './Header';
import FileCommander from './FileCommander';
import update from 'immutability-helper';
import Popup from "reactjs-popup";

import "./App.css";

class XCloud extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      isAuthenticated: false,
      token: "",
      chooserModalOpen: false,
      rateLimitModal: false,
      currentFolderId: null,
      currentFolderBucket: null,
      currentCommanderItems: [],
      namePath: [],
      selectedItems: [],
      user: this.props.user
    };
  }

  componentDidMount() {
    this.getFolderContent(this.state.user.root_folder_id);
  }

  setHeaders = () => {
    let headers = {
      Authorization: `Bearer ${localStorage.getItem("xToken")}`,
      "content-type": "application/json; charset=utf-8"
    };
    if (!this.state.user.mnemonic) {
      headers = Object.assign(headers, {
        "internxt-mnemonic": localStorage.getItem("xMnemonic")
      });
    }
    return headers;
  }

  createFolder = () => {
    var folderName = prompt("Please enter folder name");
    var headers = this.setHeaders();
    if (folderName != null) {
      fetch(`/api/storage/folder`, {
        method: "post",
        headers: headers,
        body: JSON.stringify({
          parentFolderId: this.state.currentFolderId,
          folderName: folderName
        })
      }).then(() => {
        this.getFolderContent(this.state.currentFolderId, false);
      });
    }
  }

  openFolder = (e) => {
    this.getFolderContent(e);
  }

  getFolderContent = (rootId, updateNamePath = true) => {
    const headers = this.setHeaders();
    fetch(`/api/storage/folder/${rootId}`, {
      method: "get",
      headers: headers
    })
      .then(response => response.json())
      .then(data => {
        this.deselectAll();
        this.setState({
          currentCommanderItems: _.concat(
            _.map(data.children, o => _.extend({ type: "Folder" }, o)),
            data.files
          ),
          currentFolderId: data.id,
          currentFolderBucket: data.bucket,
          selectedItems: []
        });
        if (updateNamePath) {
          const folderName = data.name.includes("root") ? "Home" : data.name;
          this.setState({
            namePath: this.pushNamePath({
              name: folderName,
              id: data.id,
              bucket: data.bucket
            }),
            isAuthorized: true
          });
        }
      });
  }

  downloadFile = (id) => {
    const headers = this.setHeaders();
    fetch(`/api/storage/file/${id}`, {
      method: "get",
      headers: headers
    }).then(async (data) => {
      if (data.status === 402){
        this.setState({rateLimitModal: true})
        return; 
      }
      const blob = await data.blob()
      const name = data.headers.get('x-file-name')
      fileDownload(blob, name)
    })
  }

  openUploadFile = () => {
    $("input#uploadFile").trigger("click");
  }

  uploadFile = (e) => {
    const data = new FormData();
    const headers = this.setHeaders();
    delete headers['content-type'];
    data.append('xfile', e.target.files[0]);
    fetch(`/api/storage/folder/${this.state.currentFolderId}/upload`, {
      method: "post",
      headers: headers,
      body: data
    }).then((response) => {
      if (response.status === 402){
        this.setState({rateLimitModal: true})
        return; 
      }
      this.getFolderContent(this.state.currentFolderId);
    })
  }

  deleteItems = () => {
    const selectedItems = this.state.selectedItems;
    const bucket = _.last(this.state.namePath).bucket;
    const headers = this.setHeaders();
    const fetchOptions = {
      method: "DELETE",
      headers: headers
    };
    if (selectedItems.length === 0) return;
    const deletionRequests = _.map(selectedItems, (v, i) => {
      const url =
        v.type === "Folder"
          ? `/api/storage/folder/${v.id}`
          : `/api/storage/bucket/${bucket}/file/${v.bucket}`;
      return fetch(url, fetchOptions);
    });
    Promise.all(deletionRequests)
      .then(result => {
        console.log("about to delete");
        setTimeout(() => {
          console.log("deleteing");
          this.getFolderContent(this.state.currentFolderId, false);
        }, 100);
      })
      .catch(err => {
        throw new Error(err);
      });
  }

  selectCommanderItem = (i, e) => {
    const selectedItems = this.state.selectedItems;
    const id = e.target.getAttribute("data-id");
    const type = e.target.getAttribute("data-type");
    const bucket = e.target.getAttribute("data-bucket");
    if (_.some(selectedItems, { id })) {
      const indexOf = _.findIndex(selectedItems, o => o.id === id);
      console.log(indexOf);
      this.setState({
        selectedItems: update(selectedItems, { $splice: [[indexOf, 1]] })
      });
    } else {
      this.setState({
        selectedItems: update(selectedItems, { $push: [{ type, id, bucket }] })
      });
    }
    e.target.classList.toggle("selected");
  }

  deselectAll() {
    const el = document.getElementsByClassName("FileCommanderItem");
    for (let e of el) {
      e.classList.remove("selected");
    }
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
        namePath: _.dropRight(previousState.namePath)
      };
    };
  }

  openChooserModal() {
    this.setState({chooserModalOpen: true})
  }

  closeModal = () => {
    this.setState({chooserModalOpen: false})
  }

  closeRateLimitModal = () => {
    this.setState({ rateLimitModal: false })
  }

  render() {
    // Check authentication
    if(this.props.isAuthenticated) {
      return (
        <div className="App">
          <Header 
            createFolder={this.createFolder}
            uploadFile={this.openUploadFile}
            uploadHandler={this.uploadFile}
            deleteItems={this.deleteItems}
            style
          />
        <FileCommander
          //   folderTree={this.state.folderTree}
          currentCommanderItems={this.state.currentCommanderItems}
          openFolder={this.openFolder}
          downloadFile={this.downloadFile}
          selectCommanderItem={this.selectCommanderItem}
          namePath={this.state.namePath}
          handleFolderTraverseUp={this.folderTraverseUp.bind(this)}
        />
        <Popup open={this.state.chooserModalOpen} closeOnDocumentClick onClose={this.closeModal} >
          <div>
            <a href={'xcloud://' + this.state.token + '://' + JSON.stringify(this.state.user)}>Open mobile app</a>
            <a onClick={this.closeModal}>Use web app</a>
          </div>
        </Popup>
        <Popup open={this.state.rateLimitModal} closeOnDocumentClick onClose={this.closeRateLimitModal} className="popup--full-screen">
            <div className="popup--full-screen__content">
              <div className="popup--full-screen__close-button-wrapper">
                  <div className="close-button" onClick={this.closeRateLimitModal}>
                    X
                  </div>
              </div>
              <div className="message-wrapper">
                <h1> You have run out of storage space! </h1>
                <h2>Get more storage space by upgrading your storage plan on your settings page.</h2>
              </div>
              <div className="buttons-wrapper">
                <div className="default-button button-primary" onClick={this.goToSettings}>
                  Take me there
                </div>
              </div>
            </div>
          </Popup>
      </div>
      );
    } else {
      return (
        <h2 className="App">Please <Link to='/login'>login</Link> into your X Cloud account</h2>
      )
    }
  }
}

export default XCloud;
