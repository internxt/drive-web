import * as React from "react";
import { Link } from 'react-router-dom';
import { Alert } from 'react-bootstrap';

import history from './history';
import "./App.css";

class Activation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isActivated: null
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
      if(response.status === 200) {
        // Successfull activation
        this.setState({ isActivated: true });
      } else {
        // Wrong activation
        this.setState({ isActivated: false })
      }
    }).catch(error => {
      console.log('Activation error: ' + error);
    })
  }

  render() {
    if (this.state.isActivated != null) {
      return(
        <div>
          {
            this.state.isActivated ? (
              <Alert classname="Alert" variant="success">
                <h3>Your account has successfully activated!</h3>
                <p>Now you will be redirected to <Link to="/login">login</Link>...</p>
                <script>setTimeout(() => { history.push('/app') }, 10000);</script>
              </Alert>
            ) : (
              <Alert classname="Alert" variant="danger">
                <h3>Your account needs to be activated!</h3>
                <p> 
                  Search your mail inbox for activation mail..
                </p>
              </Alert>
            )
          }
        </div>
      )
    } else {
      return( <div></div>)
    }
    
  }
}

export default Activation;
