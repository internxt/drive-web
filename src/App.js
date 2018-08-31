import _ from 'lodash';
import $ from 'jquery';
import fileDownload from 'js-file-download';
import React, { Component } from 'react';
import Header from './Header';
import FileCommander from './FileCommander';
// import logo from './logo.svg';
import './App.css';

class App extends Component {
  
  
  constructor() {
    super()
    this.state = {
      token: "",
      user: {},
      currentFolderId: null,
      currentCommanderItems: [],
      namePath: []
    }
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
    this.openFolder = this.openFolder.bind(this)
    this.getFolderContent = this.getFolderContent.bind(this)
    this.createFolder = this.createFolder.bind(this)
    this.openUploadFile = this.openUploadFile.bind(this)
    this.openUploadFile = this.openUploadFile.bind(this)
    this.uploadFile = this.uploadFile.bind(this)
    this.downloadFile = this.downloadFile.bind(this)
  }

  getFolderContent(rootId, up) {
    fetch(`/api/storage/folder/${rootId}`, {
      method: 'get',
      headers: {
          "Authorization": `Bearer ${sessionStorage.getItem('xToken')}`,
          'content-type': 'application/json; charset=utf-8',
      }
    })
    .then(response => response.json())
    .then(data => {
      this.setState({
        currentCommanderItems: _.concat(_.map(data.children, o => _.extend({type: 'Folder'}, o)), data.files),
        currentFolderId: data.id
      })
      if (!up) {
        this.setState(prevState => ({
          namePath: [...prevState.namePath, {name: data.name, id: data.id}]
        }))
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
        this.getFolderContent(this.state.currentFolderId)
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
    }).then(data => {
      return { file: data.blob(), name: data.headers.get('x-file-name') }
    }).then(data => {
      fileDownload(data.file, data.name)
    })
  }

  popNamePath() {
    return (previousState, currentProps) => {
      return { ...previousState, namePath: _.dropRight(previousState.namePath) };
    }
  }

  folderTraverseUp() {
    this.setState(this.popNamePath(), () => {
      this.getFolderContent(_.last(this.state.namePath).id, true)
    })
  }

  render() {
    return (
      <div className="App">
        <Header 
          createFolder={this.createFolder}
          uploadFile={this.openUploadFile}
          uploadHandler={this.uploadFile}
        />
        <FileCommander 
          //   folderTree={this.state.folderTree} 
          currentCommanderItems={this.state.currentCommanderItems}
          openFolder={this.openFolder}
          downloadFile={this.downloadFile}
          namePath={this.state.namePath}
            handleFolderTraverseUp={this.folderTraverseUp.bind(this)}
        />
      </div>
    );
  }
}

export default App;
