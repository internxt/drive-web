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
        window.location.href = "https://www.apple.com/es/ios/app-store/";
      }
    } else {
      history.push("/");
    }
  }

  render() {

    if (this.state.isActivated != null) {

      if (this.state.isActivated === true) {
        setTimeout(this.redirect, 10000);
      }
      
      return (
        <div>
          {
            this.state.isActivated ? (
              <Alert className="Alert" variant="success">
                <h3>Your account has successfully activated!</h3>
                <p>Now you will be redirected to <Link to="/login">login</Link>...</p>
              </Alert>
            ) : (
                <Alert className="Alert" variant="danger">
                  <h3>Your account needs to be activated!</h3>
                  <p>Search your mail inbox for activation mail..</p>
                </Alert>
              )
          }
        </div>
      )
    } else {
      return <div><p>Activating... {this.state.isActivated}</p></div>
    }

  }
}

export default Activation;
