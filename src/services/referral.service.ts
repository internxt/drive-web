import { getHeaders } from '../lib/auth';

export const referralCopiedText = 'I\'ve made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 10 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!';

export const getCredit = async (): Promise<number> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/credit`, {
    method: 'GET',
    headers: getHeaders(true, false)
  });

  if (response.status !== 200) {
    throw new Error('Could not get users credit');
  }
  const data = await response.json();
  const credit = data.userCredit;

  return credit;
};

export const parseUrl = (text: string): string => (
  new URLSearchParams(text).toString()
);

export const sendInvitationEmail = async (email: string): Promise<void> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/invite`, {
    method: 'POST',
    headers: getHeaders(true, false),
    body: JSON.stringify({ email })
  });

  if (response.status === 429) {
    throw new Error('Too many requests, please try again later');
  }
  if (response.status !== 200) {
    throw new Error('Could not send invitation');
  }
};

export const sendClaimEmail = async (email: string): Promise<void> => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/claim`, {
    method: 'POST',
    headers: getHeaders(true, false),
    body: JSON.stringify({ email })
  });

  if (response.status !== 200) {
    throw new Error('Internal server error');
  }
};