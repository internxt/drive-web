import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import App from './App';
import reportWebVitals from './reportWebVitals';
import { store } from './store';
import { userActions } from './store/slices/user';
import { teamActions } from './store/slices/team';

import plugins from './plugins';
import { planThunks } from './store/slices/plan';
import { productsThunks } from './store/slices/products';
import storageThunks from './store/slices/storage/storage.thunks';
import { sessionActions } from './store/slices/session';

import './index.scss';

// Installs plugins
plugins.forEach(plugin => plugin.install(store));

// Initializes store
store.dispatch(userActions.initialize());
store.dispatch(teamActions.initialize());
store.dispatch(sessionActions.initialize());
store.dispatch(storageThunks.initializeThunk());
store.dispatch(planThunks.initializeThunk());
store.dispatch(productsThunks.initializeThunk());

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
