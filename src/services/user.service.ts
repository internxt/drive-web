import { getHeaders } from '../lib/auth';
import { IUserPlan } from '../models/interfaces';

export async function initializeUser(email: string, mnemonic: string): Promise<any> {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/initialize`, {
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

export const sendDeactivationEmail = (email: string): Promise<Response> => {
  return fetch(`${process.env.REACT_APP_API_URL}/api/reset/${email}`, {
    method: 'GET',
    headers: getHeaders(false, false)
  });
};

export const fetchUserPlan = async (): Promise<IUserPlan | null> => {
  const isTest = process.env.NODE_ENV !== 'production' ? true : false;
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/storage/user/info/stripe/${isTest}`, {
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
  sendDeactivationEmail,
  fetchUserPlan
};

export default userService;