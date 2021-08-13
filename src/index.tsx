import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import App from './App';
import reportWebVitals from './reportWebVitals';
import { store } from './store';
import { userActions } from './store/slices/user';
import { teamActions } from './store/slices/team';

import './index.scss';
import { storageThunks } from './store/slices/storage';
import { planThunks } from './store/slices/plan';
import plugins from './plugins';

// Installs plugins
plugins.forEach(plugin => plugin.install());

// Initializes store
store.dispatch(userActions.initialize());
store.dispatch(teamActions.initialize());
store.dispatch(storageThunks.initializeThunk());
store.dispatch(planThunks.initializeThunk());

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
