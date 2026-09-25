import { Page } from '@playwright/test';
import { DrivePage } from '../pages/drivePage';
import { logInThroughUI } from './authRouteMocks';
import { mockDriveRoutes } from './driveRouteMocks';

export const openMockedDrive = async (page: Page) => {
  const requests = await mockDriveRoutes(page);
  await logInThroughUI(page);

  return { drivePage: new DrivePage(page), requests };
};
