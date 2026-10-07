import { expect, Page } from '@playwright/test';
import { DrivePage, UploadFile } from '../pages/drivePage';
import { NameCollisionDialogPage } from '../pages/nameCollisionDialogPage';
import { logInThroughUI } from './authRouteMocks';
import { MockedDriveOptions, mockDriveRoutes } from './driveRouteMocks';

const FIRST_FILE_LISTED_TIMEOUT = 10000;
const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  txt: 'text/plain',
  pdf: 'application/pdf',
};

export const buildUploadFile = (name: string): UploadFile => ({
  name,
  mimeType: MIME_TYPES_BY_EXTENSION[name.split('.').pop() ?? ''] ?? 'application/octet-stream',
  buffer: Buffer.from(`content of ${name}`),
});

/**
 * Mocks the API around the given Drive, logs in through the UI and, when the Drive has
 * files, waits until the first one is listed.
 */
export const openMockedDrive = async (page: Page, options: MockedDriveOptions = {}) => {
  const requests = await mockDriveRoutes(page, options);
  await logInThroughUI(page);

  const drivePage = new DrivePage(page);
  const [firstFile] = options.files ?? [];
  if (firstFile) {
    await expect(drivePage.fileRow(`${firstFile.plainName}.${firstFile.type}`)).toBeVisible({
      timeout: FIRST_FILE_LISTED_TIMEOUT,
    });
  }

  return { drivePage, collisionDialog: new NameCollisionDialogPage(page), requests };
};
