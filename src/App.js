import _ from 'lodash';
import React, { Component } from 'react';
import { Switch, Route } from 'react-router-dom';

import KeyPage from './KeyPage';
import './App.css';
import Login from './Login';
import Register from './Register';
import XCloud from './XCloud';
import NotFound from './NotFound';
import Maintenance from './Maintenance';
import Plans from './components/Plans';
import PayMethods from './components/PayMethods';

import history from './history';
import {StripeProvider} from 'react-stripe-elements';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      token: "",
      user: {},
      isAuthenticated: false
    }
    this.handleKeySaved = this.handleKeySaved.bind(this);
  }

  handleKeySaved(user) {
    this.setState({
      isAuthenticated: true,
      user
    });
  }

  userHasAuthenticated(authenticated) {
    this.setState({ isAuthenticated: authenticated });
  }

  render() {
    return (
      <div>
        <Switch>
          <Route path='/register' render={ (props) => <Register {...props} history={history} isAuthenticated={this.state.isAuthenticated} userHasAuthenticated={this.userHasAuthenticated}/> }/>
          <Route path='/login' render={ (props) => <Login {...props} history={history} isAuthenticated={this.state.isAuthenticated} userHasAuthenticated={this.userHasAuthenticated}/> }/>
          <Route path='/plans' render={ (props) => <Plans /> }/>
          <Route path='/pay' render={ (props) => <PayMethods /> }/> 
          <Route path='/keyPage' render={ (props) => <KeyPage history={history} isAuthenticated={this.state.isAuthenticated} /> }/>
          <Route path='/app' render={ (props) => <XCloud {...props} history={history} isAuthenticated={this.state.isAuthenticated} user={this.state.user}/>} />
          <Route path='/' component={ Maintenance }/>
          <Route component={ NotFound } />
        </Switch>
      </div>
    )
  }
}

export default App;
