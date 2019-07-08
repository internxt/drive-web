import * as React from "react";
import { Popover, OverlayTrigger } from 'react-bootstrap';

import history from "../../history";
import copyIcon from "../../assets/Dashboard-Icons/Copy.svg";
import infoIcon from "../../assets/Dashboard-Icons/Info.svg";
import infoOnIcon from "../../assets/Dashboard-Icons/InfoOn.svg";
import { copyToClipboard } from "../../utils";
import "./KeyPage.css";

const SAVE_OPTIONS = [
  {
    label: "I have copied and saved my key",
    value: "USER", // do nothing. user will save pass manually
    tooltip: "By choosing this option, your files are encrypted and only you store the decryption key. You will need to enter your password and key to use your account. Most secure option.",
    ref: React.createRef()
  },
  {
    label: "I want to save my key online",
    value: "ONLINE", // save on server
    tooltip: "We store your file decryption key. However, unlike others, your password is used to locally encrypt your key before we store it, thus never have access to it. Only password needed at login.",
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
    const user = localStorage.getItem('xUser');
    // Check user authentication and redirect to login if necessary
    if (this.props.isAuthenticated || user) {
      // When exists user in local but isAuthenticated is not true, set props
      if (!this.props.isAuthenticated) { this.props.handleKeySaved(user); }
      // In case user has activated storeMnemonic option, store on local and continue to X Cloud
      if (this.props.user.storeMnemonic === true && this.props.user.mnemonic) {
        localStorage.setItem('xMnemonic', this.props.user.mnemonic);
      }
      const xMnemonic = localStorage.getItem('xMnemonic');

      if (xMnemonic) {
        history.push('/app')
      } else {
        // If storageMnemonic is set, ask for mnenomic. If not, ask user to select option
        if (this.props.user.storeMnemonic === false) {
          let inputMnemonic = prompt("Please enter yout mnemonic key");
          // When user enter mnemonic, save it in local storage for X Cloud uses
          localStorage.setItem('xMnemonic', inputMnemonic);
          history.push('/app')
        } else {
          const mnemonic = this.props.user.mnemonic;
          this.setState({ mnemonic })
        }
      }
    } else {
      history.push('/login');
    }
  }

  setHeaders = () => {
    let headers = {
      Authorization: `Bearer ${localStorage.getItem("xToken")}`,
      "content-type": "application/json; charset=utf-8",
      "internxt-mnemonic": localStorage.getItem("xMnemonic")
    };
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
    let localStorageOption = false;
    if (!this.state.saveOptionSelected) return;

    // Redirect user without saving mnemonic
    if (this.state.saveOptionSelected !== "USER") { localStorageOption = true; }

    this.updateStorageOption(localStorageOption);
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
          if (!option) {
            // If not store mnemonic is selected, delete db register
            this.updateMnemonic(null);
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

  updateMnemonic = (mnemonic) => {
    try {
      const headers = this.setHeaders();

      return fetch(`/api/auth/mnemonic`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          email: this.props.user.email,
          mnemonic: mnemonic
        })
      });
    } catch (error) {
      console.log('Error updating mnemonic: ' + error)
    }

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
            You will need your key for the first time you log into your <br/> X Cloud
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
