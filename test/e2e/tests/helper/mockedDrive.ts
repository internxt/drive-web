import { expect, Page } from '@playwright/test';
import { logInThroughUI } from './authRouteMocks';
import { MockedDriveOptions, mockDriveRoutes } from './driveRouteMocks';
import { DrivePage } from '../pages/drivePage';
import { NameCollisionDialogPage } from '../pages/nameCollisionDialogPage';

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  txt: 'text/plain',
  pdf: 'application/pdf',
};

export const buildUploadFile = (name: string) => ({
  name,
  mimeType: MIME_TYPES_BY_EXTENSION[name.split('.').pop() ?? ''] ?? 'application/octet-stream',
  buffer: Buffer.from(`content of ${name}`),
});

/**
 * Mocks the API around the given Drive, logs in through the UI and waits until the first
 * file is listed. Returns the page objects and the recorder of the requests the app made.
 */
export const openMockedDrive = async (page: Page, options: MockedDriveOptions) => {
  const requests = await mockDriveRoutes(page, options);
  await logInThroughUI(page);

  const drivePage = new DrivePage(page);
  const [firstFile] = options.files ?? [];
  if (firstFile) {
    await expect(drivePage.fileRow(`${firstFile.plainName}.${firstFile.type}`)).toBeVisible({ timeout: 10000 });
  }

  return { drivePage, collisionDialog: new NameCollisionDialogPage(page), requests };
};
