import httpService from '../../core/services/http.service';

export interface InitializeUserResponse {
  user: {
    email: string;
    bucket: string;
    mnemonic: string;
    root_folder_id: number;
  };
}

export async function initializeUser(email: string, mnemonic: string): Promise<InitializeUserResponse | undefined> {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/initialize`, {
    method: 'post',
    headers: httpService.getHeaders(true, true),
    body: JSON.stringify({
      email,
      mnemonic,
    }),
  });

  if (response.status === 200) {
    return response.json();
  }
}

export const sendDeactivationEmail = (email: string): Promise<Response> => {
  return fetch(`${process.env.REACT_APP_API_URL}/api/reset/${email}`, {
    method: 'GET',
    headers: httpService.getHeaders(false, false),
  });
};

const inviteAFriend = (email: string) => {
  return httpService.post<{ email: string }, void>('/api/user/invite', { email });
};

const userService = {
  initializeUser,
  sendDeactivationEmail,
  inviteAFriend,
};

export default userService;
