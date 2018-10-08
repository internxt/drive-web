import _ from 'lodash';
import $ from 'jquery';
import fileDownload from 'js-file-download';
import React, { Component } from 'react';
import Header from './Header';
import FileCommander from './FileCommander';
import update from 'immutability-helper';
import {isMobile} from 'react-device-detect';
import Popup from "reactjs-popup";
import Loader from './Loader';
import './App.css';

class App extends Component {
  
  
  constructor() {
    super()
    this.state = {
      token: "",
      user: {},
      currentFolderId: null,
      currentFolderBucket: null,
      currentCommanderItems: [],
      namePath: [],
      isAuthorized: false,
      selectedItems: [],
      chooserModalOpen: false
    }
    this.openFolder = this.openFolder.bind(this)
    this.getFolderContent = this.getFolderContent.bind(this)
    this.createFolder = this.createFolder.bind(this)
    this.openUploadFile = this.openUploadFile.bind(this)
    this.openUploadFile = this.openUploadFile.bind(this)
    this.uploadFile = this.uploadFile.bind(this)
    this.downloadFile = this.downloadFile.bind(this)
    this.deleteItems = this.deleteItems.bind(this)
    this.selectCommanderItem = this.selectCommanderItem.bind(this)
    this.closeModal = this.closeModal.bind(this)
  }

  componentDidMount() {
    var civicSip = new civic.sip({ appId: 'Skzcny80G' }); // eslint-disable-line no-undef
    if (!sessionStorage.getItem('xToken')) {
      civicSip.signup({ style: 'popup', scopeRequest: civicSip.ScopeRequests.BASIC_SIGNUP }); // eslint-disable-line no-undef
    } else {
      this.getFolderContent(JSON.parse(sessionStorage.getItem('xUser')).root_folder_id)
    }
    civicSip.on('auth-code-received', (event) => {
      var jwtToken = event.response;
      fetch('/api/auth', {
        method: 'get',
        headers: {
            "civicToken": jwtToken,
            'content-type': 'application/json; charset=utf-8',
        }
      })
      .then(response => {
        return response.json()
      })
      .then(response => {
        if (isMobile) {
          this.setState({chooserModalOpen: true})
        }
        var token = response.token
        var user = response.user
        sessionStorage.setItem('xToken', token)
        sessionStorage.setItem('xUser', JSON.stringify(user))
        this.setState({token, user})
        this.getFolderContent(user.root_folder_id)
      })
    });

    civicSip.on('user-cancelled', function (event) {

    });

    civicSip.on('read', function (event) {

    });

    civicSip.on('civic-sip-error', function (error) {
        console.log('Error type = ' + error.type);
        console.log('Error message = ' + error.message);
    });
  }

  getFolderContent(rootId, updateNamePath = true) {
    fetch(`/api/storage/folder/${rootId}`, {
      method: 'get',
      headers: {
          "Authorization": `Bearer ${sessionStorage.getItem('xToken')}`,
          'content-type': 'application/json; charset=utf-8',
      }
    })
    .then(response => response.json())
    .then(data => {
      this.deselectAll()
      this.setState({
        currentCommanderItems: _.concat(_.map(data.children, o => _.extend({type: 'Folder'}, o)), data.files),
        currentFolderId: data.id,
        currentFolderBucket: data.bucket,
        selectedItems: []
      })
      if (updateNamePath) {
        const folderName = data.name.includes('ROOT') ? 'Root' : data.name
        this.setState({
          namePath: this.pushNamePath({name: folderName, id: data.id, bucket: data.bucket}),
          isAuthorized: true
        })
      }
    })
  }

  openFolder(e) {
    this.getFolderContent(e)
  }

  createFolder() {
    var folderName = prompt("Please enter folder name");
    if (folderName != null) {
      fetch(`/api/storage/folder`, {
        method: 'post',
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem('xToken')}`,
            'content-type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          "parentFolderId": this.state.currentFolderId,
          "folderName": folderName
        })
      }).then(() => {
        this.getFolderContent(this.state.currentFolderId, false)
      })
    }
  }

  openUploadFile() {
    $('input#uploadFile').trigger('click')
  }

  uploadFile(e) {
    const data = new FormData();
    data.append('xfile', e.target.files[0]);
    fetch(`/api/storage/folder/${this.state.currentFolderId}/upload`, {
      method: 'post',
      headers: {
          "Authorization": `Bearer ${sessionStorage.getItem('xToken')}`,
      },
      body: data
    }).then(() => {
      this.getFolderContent(this.state.currentFolderId)
    })
  }

  downloadFile(id) {
    fetch(`/api/storage/file/${id}`, {
      method: 'get',
      headers: {
          "Authorization": `Bearer ${sessionStorage.getItem('xToken')}`
      }
    }).then(async (data) => {
      const blob = await data.blob()
      const name = data.headers.get('x-file-name')
      fileDownload(blob, name)
    })
  }

  deleteItems() {
    const selectedItems = this.state.selectedItems
    const bucket = _.last(this.state.namePath).bucket
    const fetchOptions = {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${sessionStorage.getItem('xToken')}` }
    }
    if (selectedItems.length === 0) return
    const deletionRequests = _.map(selectedItems, (v, i) => {
      const url = v.type === 'Folder' ? `/api/storage/folder/${v.id}` : `/api/storage/bucket/${bucket}/file/${v.bucket}`
      return fetch(url, fetchOptions)
    })
    Promise.all(deletionRequests)
      .then((result) => {
        console.log('about to delete');
        setTimeout(() => {
          console.log('deleteing');
          this.getFolderContent(this.state.currentFolderId, false)
        }, 100)
      }).catch((err) => {
        throw new Error(err)
      });
  }

  selectCommanderItem(i, e) {
    const selectedItems = this.state.selectedItems
    const id = e.target.getAttribute('data-id')
    const type = e.target.getAttribute('data-type')
    const bucket = e.target.getAttribute('data-bucket')
    if (_.some(selectedItems, { id })) {
      const indexOf = _.findIndex(selectedItems, o => o.id === id)
      console.log(indexOf);
      this.setState({
        selectedItems: update(selectedItems, { $splice: [[indexOf, 1]] })
      })
    } else {
      this.setState({
        selectedItems: update(selectedItems, { $push: [{ type, id, bucket }] })
      })
    }
    e.target.classList.toggle('selected')
  }

  deselectAll() {
    const el = document.getElementsByClassName('FileCommanderItem')
    for (let e of el) {
      e.classList.remove('selected')
    }
  }

  pushNamePath(path) {
    return update(this.state.namePath, { $push: [path] })
  }

  popNamePath() {
    return (previousState, currentProps) => {
      return { ...previousState, namePath: _.dropRight(previousState.namePath) };
    }
  }

  folderTraverseUp() {
    this.setState(this.popNamePath(), () => {
      this.getFolderContent(_.last(this.state.namePath).id, false)
    })
  }
  
  closeModal() {
    this.setState({chooserModalOpen: false})
  }

  render() {
    const isAuthorized = this.state.isAuthorized
    return (
      <div className="App">
        {
          isAuthorized ? (
            <Header 
              createFolder={this.createFolder}
              uploadFile={this.openUploadFile}
              uploadHandler={this.uploadFile}
              deleteItems={this.deleteItems}
              style
            />
          ) : null
        }
        {
          isAuthorized ? (
          <FileCommander
            //   folderTree={this.state.folderTree}
            currentCommanderItems={this.state.currentCommanderItems}
            openFolder={this.openFolder}
            downloadFile={this.downloadFile}
            selectCommanderItem={this.selectCommanderItem}
            namePath={this.state.namePath}
            handleFolderTraverseUp={this.folderTraverseUp.bind(this)}
          />
        ) : (
          <div className="loader__wrapper full-height">
            <Loader className="loader"/>
          </div>
        )
        }
        <Popup
          open={this.state.chooserModalOpen}
          closeOnDocumentClick
          onClose={this.closeModal}
        >
        <div>
          <a href={'xcloud://' + this.state.token + '://' + JSON.stringify(this.state.user)}>Open mobile app</a>
          <a onClick={this.closeModal}>Use web app</a>
        </div>
        </Popup>
      </div>
    );
  }
}

export default App;
