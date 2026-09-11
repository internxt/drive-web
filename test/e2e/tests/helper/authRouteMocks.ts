import { expect, Page, Request, Route } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { staticData } from './staticData';
import { getLoggedUser, getUserCredentials } from './getUser';

const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;

export const INVALID_EMAIL = 'invalid@internxt.com';

const loggedUser = getLoggedUser();

const mockLoginCall = async (route: Route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      hasKeys: true,
      sKey: '53616c7465645f5f2aa5386bc0b15f6f69a733acdd46a6551dc004f6c1cb6352390535de3ec17e9b96da7de984e5d27e79ad04a88a2cc8c6315f03dc0b0d174c',
      tfa: false,
      hasKyberKeys: true,
      hasEccKeys: true,
    }),
  });
};

const mockAccessCall = async (route: Route, request: Request) => {
  const { email } = request.postDataJSON();

  if (email === INVALID_EMAIL) {
    return route.fulfill({
      status: 400,
      body: JSON.stringify({ message: 'Wrong login credentials' }),
    });
  }

  await route.fulfill({
    status: 200,
    body: JSON.stringify({
      user: loggedUser.user,
      token: loggedUser.token,
      newToken: loggedUser.newToken,
      userTeam: loggedUser.userTeam,
    }),
  });
};

const mockRefreshUserCall = async (route: Route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: loggedUser.user, newToken: loggedUser.newToken }),
  });
};

/**
 * Mocks the auth endpoints so specs can log in with the mocked user from user.json.
 */
export const mockAuthRoutes = async (page: Page) => {
  await page.route(`${BASE_API_URL}/auth/login`, mockLoginCall);
  await page.route(`${BASE_API_URL}/auth/login/access`, mockAccessCall);
  await page.route(`${BASE_API_URL}/users/refresh`, mockRefreshUserCall);
};

export const logInThroughUI = async (page: Page) => {
  const credentials = getUserCredentials();
  const loginPage = new LoginPage(page);

  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await loginPage.typeEmail(credentials.email);
  await loginPage.typePassword(credentials.password);
  const driveTitle = await loginPage.clickLogIn();
  expect(driveTitle).toEqual(staticData.driveTitle);
};
