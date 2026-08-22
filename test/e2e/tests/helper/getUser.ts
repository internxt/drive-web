import { readFileSync } from 'fs';
const mockedUsers = JSON.parse(readFileSync('test/e2e/tests/user.json', 'utf8'));

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

function base64url(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateMockToken(claims: Record<string, unknown>): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url({ ...claims, iat: now, exp: now + TOKEN_LIFETIME_SECONDS });
  return `${header}.${payload}.mocksignature`;
}

export const getUserCredentials = () => {
  return {
    email: process.env.PLAYWRIGHT_EMAIL_TEST,
    password: process.env.PLAYWRIGHT_PASSWORD_TEST,
  };
};

export const getLoggedUser = () => {
  const loggedUser = mockedUsers.loggedUser;
  const { email, uuid, name, lastname, username, sharedWorkspace, bridgeUser } = loggedUser.user;

  return {
    ...loggedUser,
    token: generateMockToken({ email }),
    newToken: generateMockToken({
      uuid,
      email,
      name,
      lastname,
      username,
      sharedWorkspace,
      networkCredentials: { user: bridgeUser },
      workspaces: { owners: [] },
    }),
  };
};

export const getUser = () => {
  const mockedUser = mockedUsers.mockedUser;
  const { email, uuid } = mockedUser.user;

  return {
    ...mockedUser,
    token: generateMockToken({ email }),
    newToken: generateMockToken({ email, uuid }),
  };
};
