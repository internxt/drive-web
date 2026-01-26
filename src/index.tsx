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
import localStorageService from 'services/local-storage.service';
import './app/i18n/services/i18n.service';
import { TranslationProvider } from 'app/i18n/provider/TranslationProvider';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from 'app/theme/ThemeProvider';
import { LiveChatLoaderProvider } from 'react-live-chat-loader';
import { DialogManagerProvider } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import envService from 'services/env.service';
import { enforceCanonicalDriveDomain } from 'utils/canonicalDomain.utils';
import { initializeServiceWorkers } from 'utils/initializeServiceWorkers.utils';

/**
 * Patches Node.prototype.removeChild to prevent NotFoundError when browser
 * translation features (like Edge auto-translate) move DOM nodes.
 *
 * Browser translators modify the DOM by wrapping or moving text nodes, which can
 * cause React to lose track of its nodes and throw "Failed to execute 'removeChild'"
 * errors during cleanup.
 *
 * This patch adds a safety check before removing nodes, allowing translation to
 * work while preventing crashes.
 *
 * This must be placed here because if we move it to a function (in another file),
 * the function will be called too late.
 *
 * Read more: https://github.com/vercel/next.js/issues/58055#issuecomment-3133346877
 */
if (typeof Node !== 'undefined' && Node.prototype.removeChild) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (!this.contains(child)) {
      console.warn('Google Translate attempted to remove a child node from the wrong parent. Skipping.', {
        childNode: child?.nodeName,
        expectedParent: this?.nodeName,
        actualParent: child?.parentNode?.nodeName,
      });
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
}

enforceCanonicalDriveDomain();

// Initialize workers immediately
initializeServiceWorkers();

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
