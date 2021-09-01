import { getHeaders } from '../lib/auth';

export async function initializeUser(email: string, mnemonic: string): Promise<any> {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/initialize`, {
    method: 'post',
    headers: getHeaders(true, true),
    body: JSON.stringify({
      email,
      mnemonic,
    }),
  });

  if (response.status === 200) {
    const body = response.json();

    return body;
  }
}

export const sendDeactivationEmail = (email: string): Promise<Response> => {
  return fetch(`${process.env.REACT_APP_API_URL}/api/reset/${email}`, {
    method: 'GET',
    headers: getHeaders(false, false),
  });
};

const userService = {
  initializeUser,
  sendDeactivationEmail,
};

export default userService;
