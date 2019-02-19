import _ from 'lodash';
import React, { Component } from 'react';
import { Switch, Route } from 'react-router-dom';

import KeyPage from './KeyPage';
import './App.css';
import Login from './Login';
import Register from './Register';
import XCloud from './XCloud';
import Activation from './Activation';
import NotFound from './NotFound';
import Maintenance from './Maintenance';
import Plans from './components/Plans';
import PayMethods from './components/PayMethods';

import history from './history';
import {StripeProvider} from 'react-stripe-elements';
import Settings from './components/Settings';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      token: "",
      user: {},
      isAuthenticated: false,
      isActivated: false
    }
  }

  // Method for set user and notice login
  handleKeySaved = (user) => {
    this.setState({
      isAuthenticated: true,
      user
    });
  }

  userHasAuthenticated = (authenticated) => {
    this.setState({ isAuthenticated: authenticated });
  }

  userHasActivated = (activated) => {
    this.setState({ isActivated: activated });
  }

  render() {
    return (
      <div>
        <Switch>
          <Route path='/register' render={ (props) => <Register {...props}  
            isAuthenticated={this.state.isAuthenticated} 
            userHasAuthenticated={this.userHasAuthenticated}
            isActivated={this.state.isActivated}/> 
          }/>
          <Route path='/login' render={ (props) => <Login {...props}  
            isAuthenticated={this.state.isAuthenticated} 
            userHasAuthenticated={this.userHasAuthenticated}
            handleKeySaved={this.handleKeySaved}
            isActivated={this.state.isActivated}/> 
          }/>
          <Route path='/activations/:token' render={ (props) => <Activation /> }/>
          <Route path='/settings' render={ (props) => <Settings /> }/> 
          <Route path='/keyPage' render={ (props) => <KeyPage isAuthenticated={this.state.isAuthenticated} /> }/>
          <Route path='/app' render={ (props) => <XCloud {...props} 
            isAuthenticated={this.state.isAuthenticated} 
            user={this.state.user}
            isActivated={this.state.isActivated}/>} />
          <Route path='/' component={ Maintenance }/>
          <Route component={ NotFound } />
        </Switch>
      </div>
    )
  }
}

export default App;
