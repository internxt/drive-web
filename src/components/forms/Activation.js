import * as React from "react";
import { Link } from 'react-router-dom';
import { Alert } from 'react-bootstrap';

import history from '../../history';
import "../../App.css";

import { isMobile, isAndroid, isIOS } from 'react-device-detect'

class Activation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isActivated: null,
      isError: false
    };

    this.redirect = this.redirect.bind(this);
  }

  componentDidMount() {
    // Get token from path and activate account through api call
    const token = this.props.match.params.token;
    fetch(
      'https://api.internxt.com/activations/' + token, {
        method: "GET",
      }
    ).then(response => {
      if (response.status === 200) {
        // Successfull activation
        this.setState({ isActivated: true });

      } else {
        // Wrong activation
        this.setState({ isActivated: false })
      }
    }).catch(error => {
      this.setState({ isActivated: false })
      console.log('Activation error: ' + error);
    })
  }

  redirect = () => {

    if (isMobile) {
      if (isAndroid) {
        window.location.href = "https://play.google.com/store/apps/details?id=com.internxt.cloud";
      } else if (isIOS) {
        window.location.href = "https://itunes.apple.com/us/app/x-cloud-secure-file-storage/id1465869889";
      }
    } else {
      history.push("/");
    }
  }

  render() {

    if (this.state.isActivated === true) {
      setTimeout(this.redirect, 1000);
    }

    return <Alert className="Alert" variant={this.state.isActivated ? "success" : "danger"}>
      {this.state.isActivated == null ? <div>
        <h3>Activate account</h3>
        <p>Activating...</p>
      </div> : ''}

      {this.state.isActivated ? <div>
        <h3>Your account has successfully activated!</h3>
        <p>Now you will be redirected to <Link to="/login">login</Link>...</p>
      </div> : ''}

      {this.state.isActivated === false ? <div>
        <h3>Invalid activation code</h3>
        <p>Your activation code is invalid. Maybe you have used this link before and your account is already activated.</p>
        <p>Check you have access to your account: <a href="/login">login</a></p>
      </div> : ""}
    </Alert>
  }
}

export default Activation;
