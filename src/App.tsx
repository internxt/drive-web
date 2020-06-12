import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import './App.scss';
import Login from './components/forms/Login';
import Remove from './components/forms/Remove';
import New from './components/forms/New'
import XCloud from './components/xcloud/XCloud';
import Activation from './components/forms/Activation';
import NotFound from './NotFound';
import Deactivation from './components/forms/Deactivation';
import Share from './components/forms/Share';
import Reset from './components/forms/Reset';
import Storage from './components/Storage';
import Security from './components/Security';
import { ToastContainer } from 'react-toastify';
import Checkout from './components/Checkout';


class App extends React.Component {
  state = {
    token: "",
    user: {},
    isAuthenticated: false,
    isActivated: false
  }
  // Method for set user in props.user and localStorage
  handleKeySaved = (user: JSON) => {
    localStorage.setItem('xUser', JSON.stringify(user));
    this.setState({ isAuthenticated: true, user: user });
  }

  render() {
    if (window.location.pathname) {
      let pathName = window.location.pathname.split('/')[1];
      var toast;

      if (/^[a-z0-9]{10}$/.test(pathName)) {
        toast = <ToastContainer />
      } else {
        toast = <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={true}
          rtl={false}
          draggable={true}
          pauseOnHover={true}
          className="" />
      }
    }

    return (
      <div>
        <Switch>
          <Route exact path='/login' render={(props) => <Login {...props} isAuthenticated={this.state.isAuthenticated} handleKeySaved={this.handleKeySaved} />} />
          <Route exact path='/storage' render={(props) => <Storage {...props} isAuthenticated={this.state.isAuthenticated} />} />
          <Route path='/reset/:token' render={(props) => <Reset {...props} isAuthenticated={this.state.isAuthenticated} />} />
          <Route path='/checkout/:sessionId' render={(props) => <Checkout {...props} />} />
          <Route exact path='/reset' render={(props) => <Reset {...props} isAuthenticated={this.state.isAuthenticated} />} />
          <Route exact path='/settings' render={(props) => <Reset {...props} isAuthenticated={this.state.isAuthenticated} />} />
          <Route path='/activations/:token' render={(props) => <Activation {...props} />} />
          <Route path='/deactivations/:token' render={(props) => <Deactivation {...props} />} />
          <Route path='/security' render={(props) => <Security {...props} isAuthenticated={this.state.isAuthenticated} />} />
          <Route exact path='/app' render={(props) => <XCloud {...props}
            isAuthenticated={this.state.isAuthenticated}
            user={this.state.user}
            isActivated={this.state.isActivated}
            handleKeySaved={this.handleKeySaved} />
          } />
          <Route exact path='/new' render={(props: any) => <New {...props} />} isAuthenticated={this.state.isAuthenticated} handleKeySaved={this.handleKeySaved} />
          <Route exact path='/remove' render={(props: any) => <Remove {...props} />} isAuthenticated={this.state.isAuthenticated} handleKeySaved={this.handleKeySaved} />
          <Route exact path='/activate/:email' render={(props: any) => <New {...props} />} isAuthenticated={this.state.isAuthenticated} handleKeySaved={this.handleKeySaved} />
          <Route exact path='/:token([a-z0-9]{10})' render={(props) => <Share {...props} />} />
          <Route exact path='/'><Redirect to="/login" /></Route>
          <Route component={NotFound} />
        </Switch>

        {toast}
      </div>
    )
  }
}

export default App;
