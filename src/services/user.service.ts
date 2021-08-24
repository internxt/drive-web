import { getHeaders } from '../lib/auth';

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

const userService = {
  initializeUser,
  isUserActivated,
  sendDeactivationEmail
};

export default userService;