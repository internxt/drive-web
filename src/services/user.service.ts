import axios from 'axios';
import { getHeaders } from '../lib/auth';
import { IUserPlan } from '../models/interfaces';
import envService from './env.service';

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

export const sendDeactivationEmail = (email: string): Promise<Response> => {
  return fetch(`/api/reset/${email}`, {
    method: 'GET',
    headers: getHeaders(false, false)
  });
};

export const fetchUserPlan = async (): Promise<IUserPlan | null> => {
  const isTest = !envService.isProduction();
  const response = await axios.get('/api/storage/user/info/stripe/');

  return response.data;
};

const userService = {
  initializeUser,
  isUserActivated,
  sendDeactivationEmail,
  fetchUserPlan
};

export default userService;