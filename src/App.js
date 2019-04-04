import _ from 'lodash';
import React, { Component } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import './App.css';
import Login from './components/forms/Login';
import New from './components/forms/New'
import XCloud from './components/xcloud/XCloud';
import Activation from './components/forms/Activation';
import NotFound from './NotFound';
import Deactivation from './components/forms/Deactivation';


import Settings from './components/Settings';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      token: "",
      user: {},
      isAuthenticated: false
    }
  }

  // Method for set user in props.user and localStorage
  handleKeySaved = (user) => {
    localStorage.setItem('xUser', JSON.stringify(user));
    this.setState({
      isAuthenticated: true,
      user
    });
  }

  render() {
    return (
      <div>
        <Switch>
          <Route exact path='/login' render={(props) => <Login {...props}
            isAuthenticated={this.state.isAuthenticated}
            handleKeySaved={this.handleKeySaved} />
          } />
          <Route path='/activations/:token' render={(props) => <Activation {...props} />} />
          <Route path='/deactivations/:token' render={(props) => <Deactivation {...props} />} />
          <Route path='/settings' render={(props) => <Settings {...props} isAuthenticated={this.state.isAuthenticated} />
          } />
          <Route exact path='/app' render={(props) => <XCloud {...props}
            isAuthenticated={this.state.isAuthenticated}
            user={this.state.user}
            isActivated={this.state.isActivated}
            handleKeySaved={this.handleKeySaved} />
          } />
          <Route exact path='/new'
                  render={(props) => <New {...props} />}
                  isAuthenticated={this.state.isAuthenticated}
                  handleKeySaved={this.handleKeySaved} />
          <Route exact path='/'>
            <Redirect to="/login" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
    )
  }
}

export default App;
