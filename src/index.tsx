import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import App from './App';
import reportWebVitals from './reportWebVitals';
import plugins from './app/core/plugins';
import { store } from './app/store';
import { userActions } from './app/store/slices/user';
import { planThunks } from './app/store/slices/plan';
import storageThunks from './app/store/slices/storage/storage.thunks';
import { taskManagerThunks } from './app/store/slices/taskManager';
import { sessionActions } from './app/store/slices/session';
import { referralsThunks } from 'app/store/slices/referrals';

import 'react-tooltip/dist/react-tooltip.css';
import './index.scss';
import { SdkFactory } from './app/core/factory/sdk';
import localStorageService from './app/core/services/local-storage.service';
import './app/i18n/services/i18n.service';
import { TranslationProvider } from 'app/i18n/provider/TranslationProvider';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from 'app/theme/ThemeProvider';
import { LiveChatLoaderProvider } from 'react-live-chat-loader';
import { DialogManagerProvider } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import envService from 'app/core/services/env.service';

const CANONICAL_DRIVE_HOSTNAME = 'drive.internxt.com';
const CANONICAL_DRIVE_ORIGIN = `https://${CANONICAL_DRIVE_HOSTNAME}`;

const buildSafeCanonicalUrl = () => {
  const isBrowser = typeof globalThis !== 'undefined';

  if (!isBrowser) {
    return CANONICAL_DRIVE_ORIGIN;
  }

  try {
    const relativeUrl = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
    const normalizedUrl = new URL(relativeUrl, CANONICAL_DRIVE_ORIGIN);

    if (normalizedUrl.origin !== CANONICAL_DRIVE_ORIGIN) {
      return CANONICAL_DRIVE_ORIGIN;
    }

    return normalizedUrl.toString();
  } catch {
    return CANONICAL_DRIVE_ORIGIN;
  }
};

const enforceCanonicalDriveDomain = () => {
  const isBrowser = typeof globalThis !== 'undefined';
  const isPreview = process.env.REACT_APP_IS_PREVIEW === 'true';
  if (!isBrowser || !envService.isProduction() || isPreview) {
    return;
  }

  if (globalThis.location.hostname === CANONICAL_DRIVE_HOSTNAME) {
    return;
  }

  const safeUrl = buildSafeCanonicalUrl();

  globalThis.location.replace(safeUrl);
};

enforceCanonicalDriveDomain();

// Installs plugins
plugins.forEach((plugin) => plugin.install(store));

SdkFactory.initialize(store.dispatch, localStorageService);

// Initializes store
store.dispatch(userActions.initialize());
store.dispatch(sessionActions.initialize());
store.dispatch(storageThunks.initializeThunk());
store.dispatch(planThunks.initializeThunk());
store.dispatch(taskManagerThunks.initializeThunk());
store.dispatch(referralsThunks.initializeThunk());

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <LiveChatLoaderProvider provider="intercom" providerKey={envService.getVariable('intercomProviderKey')}>
        <Provider store={store}>
          <DialogManagerProvider>
            <ThemeProvider>
              <TranslationProvider>
                <App />
              </TranslationProvider>
            </ThemeProvider>
          </DialogManagerProvider>
        </Provider>
      </LiveChatLoaderProvider>
    </HelmetProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
