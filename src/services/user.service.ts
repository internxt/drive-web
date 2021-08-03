import notify from '../components/Notifications';
import { getHeaders } from '../lib/auth';
import { UserSettings } from '../models/interfaces';
import localStorageService from './localStorage.service';

export function initializeUser(): Promise<number> {
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
        // Set user with new root folder id
        response.json().then((body) => {
          resolve(body.user.root_folder_id);
        });
      } else {
        reject(null);
      }
    }).catch((error) => {
      reject(error);
    });
  });
}

export function isUserActivated(): Promise<any> {
  return fetch('/api/user/isactivated', {
    method: 'get',
    headers: getHeaders(true, false)
  }).then((response) => response.json())
    .catch(() => {
      console.log('Error getting user activation');
    });
}

export const sendDeactivationEmail = async (email: string): Promise<void> => {
  await fetch(`/api/reset/${email}`, {
    method: 'GET',
    headers: getHeaders(false, false)
  });
};

export const fetchUserPlan = async (isTest: boolean) => {
  const response = await fetch(`api/storage/user/info/stripe${isTest}`, {
    method: 'GET',
    headers: getHeaders(true, false)
  });

  if (response.status !== 200) {
    if (response.status === 404) {
      throw new Error('');
    }
  }
};

const userService = {
  initializeUser,
  isUserActivated,
  sendDeactivationEmail,
  fetchUserPlan
};

export default userService;