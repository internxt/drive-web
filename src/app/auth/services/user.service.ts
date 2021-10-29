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
  return httpService.post<{ email: string; mnemonic: string }, InitializeUserResponse | undefined>('/api/initialize', {
    email,
    mnemonic,
  });
}

export const sendDeactivationEmail = (email: string): Promise<void> => {
  return httpService.get<void>(`/api/reset/${email}`);
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
