import { getHeaders } from '../lib/auth';
import { IUserPlan } from '../models/interfaces';

export async function initializeUser(email: string, mnemonic: string): Promise<any> {
  const response = await fetch('/api/initialize', {
    method: 'post',
    headers: getHeaders(true, true),
    body: JSON.stringify({
      email,
      mnemonic
    })
  });

  if (response.status === 200) {
    const body = response.json();

    return body;
  }
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

export const fetchUserPlan = async (): Promise<IUserPlan | null> => {
  const isTest = process.env.NODE_ENV !== 'production' ? true : false;
  const response = await fetch(`/api/storage/user/info/stripe/${isTest}`, {
    method: 'GET',
    headers: getHeaders(true, false)
  });

  const data = await response.json();

  if (response.status !== 200) {
    return null;
  }

  return data;
};

const userService = {
  initializeUser,
  isUserActivated,
  sendDeactivationEmail,
  fetchUserPlan
};

export default userService;