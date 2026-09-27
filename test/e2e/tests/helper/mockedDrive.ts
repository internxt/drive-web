import { Page } from '@playwright/test';
import { DrivePage } from '../pages/drivePage';
import { logInThroughUI } from './authRouteMocks';
import { MockedDriveOptions, mockDriveRoutes } from './driveRouteMocks';

export const openMockedDrive = async (page: Page, options: MockedDriveOptions = {}) => {
  const requests = await mockDriveRoutes(page, options);
  await logInThroughUI(page);

  return { drivePage: new DrivePage(page), requests };
};
