import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import App from './App';
import reportWebVitals from './reportWebVitals';
import plugins from './app/core/plugins';
import { store } from './app/store';
import { userActions } from './app/store/slices/user';
import { teamActions } from './app/store/slices/team';
import { planThunks } from './app/store/slices/plan';
import storageThunks from './app/store/slices/storage/storage.thunks';
import { taskManagerThunks } from './app/store/slices/taskManager';
import { sessionActions } from './app/store/slices/session';
import { referralsThunks } from 'app/store/slices/referrals';

import './index.scss';
import { SdkFactory } from './app/core/factory/sdk';
import localStorageService from './app/core/services/local-storage.service';
import './app/i18n/services/i18n.service';
import { TranslationProvider } from 'app/i18n/provider/TranslationProvider';

// Installs plugins
plugins.forEach((plugin) => plugin.install(store));

SdkFactory.initialize(store.dispatch, localStorageService);

// Initializes store
store.dispatch(userActions.initialize());
store.dispatch(teamActions.initialize());
store.dispatch(sessionActions.initialize());
store.dispatch(storageThunks.initializeThunk());
store.dispatch(planThunks.initializeThunk());
store.dispatch(taskManagerThunks.initializeThunk());
store.dispatch(referralsThunks.initializeThunk());

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root'),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
