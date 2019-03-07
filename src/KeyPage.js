import * as React from "react";
import { Popover, OverlayTrigger } from 'react-bootstrap';

import history from "./history";
import copyIcon from "./assets/Dashboard-Icons/Copy.svg";
import infoIcon from "./assets/Dashboard-Icons/Info.svg";
import infoOnIcon from "./assets/Dashboard-Icons/InfoOn.svg";
import { copyToClipboard } from "./utils";
import "./KeyPage.css";

const bip39 = require('bip39')
const SAVE_OPTIONS = [
  {
    label: "I have copied and saved my key",
    value: "USER", // do nothing. user will save pass manually
    tooltip: "This is the most secure option to store your files in the cloud. By choosing this option, your files are encrypted and only you store the decryption key. However, if you lose your decryption key, you will lose access to your files. Make sure your key is stored securely and safely.",
    ref: React.createRef()
  },
  {
    label: "I want to save my key online",
    value: "ONLINE", // save on server
    tooltip: "This option is what the most current secure cloud storage providers use. By choosing this option, we use your password to encrypt your file encryption and decryption keys. We never have access to your files since your password is needed to decrypt your files.",
    ref: React.createRef()
  }
];

class KeyPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mnemonic: '',
      saveOptionSelected: null,
      chooserModalOpen: false,
      infoIcons: [infoIcon, infoIcon]
    };
    this.handleRepeatClick = this.handleCopyToClipboard.bind(this);
  }

  componentDidMount() {
    const mnemonic = bip39.generateMnemonic(256);
    this.setState({ mnemonic })
    // // Check user authentication and redirect to login if necessary
    // if (this.props.isAuthenticated) {
    //   // In case user has activated storeMnemonic option, store on local and continue to X Cloud
    //   if (this.props.user.storeMnemonic == true && this.props.user.mnemonic) {
    //     localStorage.setItem('xMnemonic', this.props.user.mnemonic);
    //   }
    //   const xMnemonic = localStorage.getItem('xMnemonic');

    //   if (xMnemonic) {
    //     history.push('/app')
    //   } else {
    //     // If storageMnemonic is set, ask for mnenomic. If not, ask user to select option
    //     if (this.props.user.storeMnemonic == false && this.props.user.mnemonic) {
    //       let inputMnemonic = prompt("Please enter yout mnemonic key");
    //       if (inputMnemonic == this.props.user.mnemonic) {
    //         history.push('/app')
    //       } else {
    //         alert('Wrong mnemonic key entered');
    //         history.push('/login');
    //       }
    //     } else {
    //       const mnemonic = bip39.generateMnemonic(256);
    //       this.setState({ mnemonic })
    //     }
    //   }
    // } else {
    //   history.push('/login');
    // }
  }

  setHeaders = () => {
    let headers = {
      Authorization: `Bearer ${localStorage.getItem("xToken")}`,
      "content-type": "application/json; charset=utf-8"
    };
    if (!this.props.user.mnemonic) {
      headers = Object.assign(headers, {
        "internxt-mnemonic": localStorage.getItem("xMnemonic")
      });
    }
    return headers;
  }

  handleCopyToClipboard = () => {
    copyToClipboard(this.state.mnemonic);
  }

  handleSaveOptionClick = (saveOptionSelected) => {
    this.setState({ saveOptionSelected });
  }

  handleInfoClick = (index) => {
    let newIcon = infoIcon;
    if (this.state.infoIcons[index] === infoIcon) newIcon = infoOnIcon;
    let newIconState = this.state.infoIcons;
    newIconState[index] = newIcon;
    this.setState({ infoIcons: newIconState });
  }

  handleContinueClick = () => {
    let optionSelected = false;
    if (!this.state.saveOptionSelected) return;

    // Redirect user without saving mnemonic
    if (this.state.saveOptionSelected !== "USER") { optionSelected = true; }

    this.updateStorageOption(optionSelected);
    history.push('/app')
  }

  updateStorageOption = (option) => {
    const headers = this.setHeaders();

    fetch(`/api/user/storeOption`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: this.props.user.email,
        option: option
      })
    }).then(response => {
      if (response.status === 200) {
        response.json().then( (body) => {
          // When true option is set, save mnemonic locally. When is false, delete mnemonic
          if (option) {
            localStorage.setItem('xMnemonic', body.mnemonic);
          } else {
            localStorage.removeItem('xMnemonic');
          }
          // Set user with new storeOption property
          const updatedUser = this.props.user;
          updatedUser.storeMnemonic = option;
          this.props.handleKeySaved(updatedUser);
        });
      } else {
        // Other status (400, 500, ...)
        response.json().then( (body) => {
          alert(body.message);
        });
      }
    })
    .catch(error => {
      console.log('StoreOption error: ' + error);
    });
  }

  render() {
    if (!this.props.user.storeMnemonic) {
      return (
        <div className={`key `}>
          <div className="key-inner">
            <h2 className="key-title">
              Your encryption key is below. Please save your key!
            </h2>
            <h3 className="key-subtitle">
              You will need your key for the first time you log into your X Cloud
              with a new device. Choose one of the options below.
            </h3>
  
            <div className="mnemonic-container">
              <div className="mnemonic-value">{this.state.mnemonic}</div>
              <div onClick={this.handleCopyToClipboard} className="button-copy">
                <img src={copyIcon} alt="Copy" className="icon-copy" />
              </div>
            </div>
  
            <div className="save-key-options">
              {SAVE_OPTIONS.map((option, index) => {
                const selected =
                this.state.saveOptionSelected === option.value ? "selected" : "";
                return (
                    <div
                      key={index}
                      ref={option.ref}
                      onClick={() => this.handleSaveOptionClick(option.value)}
                      className={`button-save-key ${selected}`}
                    >
                      <span className="label">{option.label}</span>
                      <OverlayTrigger
                        trigger="click" key='top' placement='top'
                        overlay={
                          <Popover className="popover-tooltip">
                            <p>{option.tooltip}</p>
                          </Popover>
                      }>
                       <img src={this.state.infoIcons[index]} alt="Info" className="icon-info" onClick={() => this.handleInfoClick(index)}/>
                      </OverlayTrigger>
                    </div>
                );
              })}
            </div>
  
            <button className="button-continue" type="button" onClick={this.handleContinueClick} 
            disabled={!this.state.saveOptionSelected} >
              Continue
            </button>
          </div>
        </div>
      );
    } else {
      history.push('/login')
    }
  }
}

export default KeyPage;
