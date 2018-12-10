import * as React from "react";

import "./KeyPage.css";
import repeatIcon from "./assets/Dashboard-Icons/Repeat.svg";
import infoIcon from "./assets/Dashboard-Icons/Info.svg";

const SAVE_OPTIONS = [
  {
    label: "I have copied and saved my key",
    value: "USER"
  },
  {
    label: "I want to save my key online",
    value: "ONLINE"
  }
];

// MOCK /api/auth
const MOCK_RESPONSE = {
  user: {
    id: 0,
    name: "Mock User Name",
    mnemonic: "MOCK Dog Horse Yacht Snow Rain Sun Wind Shoes Money Moose MOCK"
  },
  token: "mock token"
};

class KeyPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {},
      token: null,
      mnemonic: null,
      saveOptionSelected: null
    };

    this.handleSaveOptionClick = this.handleSaveOptionClick.bind(this);
    this.handleContinueClick = this.handleContinueClick.bind(this);
    this.handleRepeatClick = this.handleRepeatClick.bind(this);
    this.saveMnemonicToDatabase = this.saveMnemonicToDatabase.bind(this);
  }

  componentDidMount() {
    const civicSip = new civic.sip({ appId: "Skzcny80G" }); // eslint-disable-line no-undef
    const xToken = sessionStorage.getItem("xToken");
    if (xToken) {
      const { onContinue } = this.props;
      const user = JSON.parse(sessionStorage.getItem("xUser"));

      // TODO: Remove next line after testing. No need to update state, component wont be visible
      this.setState({ token: xToken, user, mnemonic: user.mnemonic });
      onContinue(user, xToken);
      return;
    }

    civicSip.signup({
      style: "popup",
      scopeRequest: civicSip.ScopeRequests.BASIC_SIGNUP
    });

    civicSip.on("auth-code-received", ({ response: civicToken }) => {
      fetch("/api/auth", {
        method: "get",
        headers: {
          civicToken,
          "content-type": "application/json; charset=utf-8"
        }
      })
        .then(response => {
          console.log("/api/auth response", response);
          // TODO: Remove mock with real data from response.
          const { token, user } = MOCK_RESPONSE;
          const { mnemonic } = user;
          // TODO: Add support for multiple tokens in session storage (e.g. user__id)
          sessionStorage.setItem("xToken", token);
          sessionStorage.setItem("xUser", JSON.stringify(user));
          sessionStorage.setItem("xMnemonic", mnemonic);
          this.setState({ token, user, mnemonic });
        })
        .catch(err => {
          console.error("Auth error", err);
        });
    });

    civicSip.on("user-cancelled", event => {});

    civicSip.on("read", event => {});

    civicSip.on("civic-sip-error", error => {
      console.error(`Error type: ${error.type}. Message: ${error.message}`);
    });
  }

  handleRepeatClick() {
    console.log("get new token");
  }

  handleSaveOptionClick(saveOptionSelected) {
    this.setState({ saveOptionSelected });
  }

  handleContinueClick() {
    const { saveOptionSelected, user, token } = this.state;
    const { onContinue } = this.props;

    // Redirect user without saving mnemonic
    if (saveOptionSelected === "USER") {
      onContinue(user, token);
      return;
    }

    this.saveMnemonicToDatabase()
      .then(() => {
        console.log("User mnemonic saved to database");
        onContinue(user, token);
      })
      .catch(err => console.error("Error saving key", err));
  }

  saveMnemonicToDatabase() {
    const { user, token } = this.state;

    return fetch(`/api/auth/mnemonic`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        id: user.id,
        mnemonic: user.mnemonic
      })
    });
  }

  render() {
    const { saveOptionSelected, user } = this.state;
    console.log(user);

    return (
      <div className="key">
        <div className="key-inner">
          <h2 className="key-title">
            Your encryption key is below. Please save your key!
          </h2>
          <h3 className="key-subtitle">
            You will need your key for the first time you log into your X Cloud
            with a new device. Choose one of the options below.
          </h3>

          <div className="mnemonic-container">
            <div className="mnemonic-value">{user.mnemonic}</div>
            <div onClick={this.handleRepeatClick} className="button-repeat">
              <img src={repeatIcon} alt="Repeat" className="icon-repeat" />
            </div>
          </div>

          <div className="save-key-options">
            {SAVE_OPTIONS.map((option, index) => {
              const selected =
                saveOptionSelected === option.value ? "selected" : "";
              return (
                <div
                  key={index}
                  onClick={() => this.handleSaveOptionClick(option.value)}
                  className={`button-save-key ${selected}`}
                >
                  <span className="label">{option.label}</span>
                  <img src={infoIcon} alt="Info" className="icon-info" />
                </div>
              );
            })}
          </div>

          <div onClick={this.handleContinueClick} className="button-continue">
            Continue
          </div>
        </div>
      </div>
    );
  }
}

export default KeyPage;
