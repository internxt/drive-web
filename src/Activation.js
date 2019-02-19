import * as React from "react";
import { Link } from 'react-router-dom';

import history from './history';
import "./App.css";

class Activation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isActivated: false
    };
  }

  componentDidMount() {
    // Get token from path and activate account through api call
    const token = this.props.match.params.token;

    fetch(
      'https://api.internxt.com/activations/'+token, {
        method: "GET",
      }
    ).then(response => {
      if(response.status == 200) {
        // Successfull activation
        this.setState({ isActivated: true });
      } else {
        // Wrong activation
        this.setState({ isActivated: false })
      }
    })
  }

  checkRequestAvailable = () => {
    const lastRequest = new Date(localStorage.getItem('lastRequest'));
    if (lastRequest) {
      // If its more or equals than 24h from last request return true
      const diff = (Date.now() - lastRequest)/86400000;
      if(diff >= 1) return true; 
      else return false;
    } else {
      // If not exists lastRequest date, generate it
      localStorage.setItem('lastRequest', Date.now.toString());
      return true;
    }
  }

  sendActivationEmail = () => {
    // Check if passed one day from last email request
    if (checkRequestAvailable()) {
      // Request new activation email
      //fetch('', {});
      // TO-DO Use or build in api a function to re-send activation email
    } else {
      alert('Only one activation email request each 24h is allowed')
    }
  }

  render() {
    <div>
      {
        this.state.isActivated ? (
          <Alert variant="success">
            <h3>Your account has successfully activated!</h3>
            <p>Now you will be redirected to <Link to="/login">login</Link>...</p>
            <script>setTimeout(() => { history.push('/app') }, 5000);</script>
          </Alert>
        ) : (
          <Alert variant="danger">
            <h3>Your account needs to be activated!</h3>
            <p> 
              Search your mail inbox for activation mail or use below
              button for request another activatión email (one each 24h max).
            </p>
          </Alert>
        )
      }
    </div>
  }
}

export default Activation;
