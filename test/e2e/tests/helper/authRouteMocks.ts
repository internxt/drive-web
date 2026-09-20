import { expect, Page, Route } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';
import { getLoggedUser, getUserCredentials } from './getUser';
import { staticData } from './staticData';

export const BASE_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL;

const LOGIN_URL_PATTERN = /\/login$/;
const LOGIN_SALT_KEY =
  '53616c7465645f5f2aa5386bc0b15f6f69a733acdd46a6551dc004f6c1cb6352390535de3ec17e9b96da7de984e5d27e79ad04a88a2cc8c6315f03dc0b0d174c';

export const loggedUser = getLoggedUser();

const mockLoginCall = (route: Route) =>
  route.fulfill({
    json: { hasKeys: true, sKey: LOGIN_SALT_KEY, tfa: false, hasKyberKeys: true, hasEccKeys: true },
  });

const mockAccessCall = (route: Route) =>
  route.fulfill({
    json: {
      user: loggedUser.user,
      token: loggedUser.token,
      newToken: loggedUser.newToken,
      userTeam: loggedUser.userTeam,
    },
  });

const mockRefreshUserCall = (route: Route) =>
  route.fulfill({ json: { user: loggedUser.user, newToken: loggedUser.newToken } });

export const mockAuthRoutes = async (page: Page) => {
  await page.route(`${BASE_API_URL}/auth/login`, mockLoginCall);
  await page.route(`${BASE_API_URL}/auth/login/access`, mockAccessCall);
  await page.route(`${BASE_API_URL}/users/refresh`, mockRefreshUserCall);
};

export const logInThroughUI = async (page: Page) => {
  const credentials = getUserCredentials();
  const loginPage = new LoginPage(page);

  await page.goto(staticData.driveURL);
  await expect(page).toHaveURL(LOGIN_URL_PATTERN);
  await loginPage.typeEmail(credentials.email);
  await loginPage.typePassword(credentials.password);
  const driveTitle = await loginPage.clickLogIn();
  expect(driveTitle).toEqual(staticData.driveTitle);
};
