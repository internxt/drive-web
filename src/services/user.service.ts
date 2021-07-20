import { getHeaders } from '../lib/auth';
import { UserSettings } from '../models/interfaces';
import localStorageService from './localStorage.service';

export function initializeUser(): Promise<any> {
  const user: UserSettings = localStorageService.getUser();

  return new Promise((resolve, reject) => {
    fetch('/api/initialize', {
      method: 'post',
      headers: getHeaders(true, true),
      body: JSON.stringify({
        email: user.email,
        mnemonic: localStorageService.get('xMnemonic')
      })
    }).then((response) => {
      if (response.status === 200) {
        // Successfull intialization
        setIsUserInitialized(true);
        // Set user with new root folder id
        response.json().then((body) => {
          // TODO: update root_folder_id of the user locally
          resolve(body.user.root_folder_id);
        });
      } else {
        reject(null);
      }
    }).then(folderId => {
      // TODO: this.getFolderContent(folderId);
    })
      .catch((error) => {
        reject(error);
      });
  });
}

export function isUserActivated (): Promise<any> {
  return fetch('/api/user/isactivated', {
    method: 'get',
    headers: getHeaders(true, false)
  }).then((response) => response.json())
    .catch(() => {
      console.log('Error getting user activation');
    });
}

const userService = {
  initializeUser,
  isUserActivated
};

export default userService;