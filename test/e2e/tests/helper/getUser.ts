import { readFileSync } from 'fs';
const mockedUsers = JSON.parse(readFileSync('test/e2e/tests/user.json', 'utf8'));

export const getUserCredentials = () => {
  return {
    email: process.env.PLAYWRIGHT_EMAIL_TEST,
    password: process.env.PLAYWRIGHT_PASSWORD_TEST,
  };
};

export const getLoggedUser = () => {
  return mockedUsers.loggedUser;
};

export const getUser = () => {
  return mockedUsers.mockedUser;
};
