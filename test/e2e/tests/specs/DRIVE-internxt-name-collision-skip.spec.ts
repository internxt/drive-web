import { expect, test } from '@playwright/test';
import { logInThroughUI } from '../helper/authRouteMocks';
import { buildExistingFile, mockDriveRoutes, TrashRequest } from '../helper/driveRouteMocks';
import { staticData } from '../helper/staticData';
import { DrivePage } from '../pages/drivePage';
import { NameCollisionDialogPage } from '../pages/nameCollisionDialogPage';

const existingReport = buildExistingFile(1, 'report', 'txt');
const existingInvoice = buildExistingFile(2, 'invoice', 'pdf');

const textFile = (name: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(`content of ${name}`) });
const pdfFile = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from(`content of ${name}`) });

const duplicatedReport = textFile('report.txt');
const duplicatedInvoice = pdfFile('invoice.pdf');
const newFile = textFile('brand-new.txt');

const allOptions = [
  staticData.collisionReplaceOption,
  staticData.collisionKeepBothOption,
  staticData.collisionSkipOption,
];

test.describe('Internxt name collision skip option', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const trashRequests: TrashRequest[] = [];
  const bridgeRequests: string[] = [];

  test.beforeEach('Logging in with existing files in Drive', async ({ page }) => {
    trashRequests.length = 0;
    bridgeRequests.length = 0;

    await mockDriveRoutes(page, { existingFiles: [existingReport, existingInvoice], trashRequests, bridgeRequests });
    await logInThroughUI(page);

    const drivePage = new DrivePage(page);
    await expect(drivePage.fileRow('report.txt')).toBeVisible({ timeout: 10000 });
  });

  test('TC1: Validate that skipping a single duplicated file keeps the existing file and uploads nothing', async ({
    page,
  }) => {
    const drivePage = new DrivePage(page);
    const collisionDialog = new NameCollisionDialogPage(page);

    await drivePage.uploadFiles([duplicatedReport]);

    await collisionDialog.expectOpenFor('report.txt');
    await collisionDialog.expectOptions(allOptions);
    await collisionDialog.expectApplyToAllVisible(false);

    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    await expect(drivePage.fileRow('report.txt')).toHaveCount(1);
    expect(trashRequests).toHaveLength(0);
    expect(bridgeRequests).toHaveLength(0);
  });

  test('TC2: Validate that only the non-conflicting files are uploaded when the duplicated one is skipped', async ({
    page,
  }) => {
    const drivePage = new DrivePage(page);
    const collisionDialog = new NameCollisionDialogPage(page);

    await drivePage.uploadFiles([duplicatedReport, newFile]);

    await collisionDialog.expectOpenFor('report.txt');
    await expect.poll(() => bridgeRequests.length, { timeout: 10000 }).toBeGreaterThan(0);

    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    expect(trashRequests).toHaveLength(0);
  });

  test('TC3: Validate that duplicated files are resolved one by one when "apply to all" is not checked', async ({
    page,
  }) => {
    const drivePage = new DrivePage(page);
    const collisionDialog = new NameCollisionDialogPage(page);

    await drivePage.uploadFiles([duplicatedReport, duplicatedInvoice]);

    await collisionDialog.expectOpenFor('report.txt');
    await collisionDialog.expectApplyToAllVisible(true);
    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectOpenFor('invoice.pdf');
    await collisionDialog.expectApplyToAllVisible(false);
    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    expect(trashRequests).toHaveLength(0);
    expect(bridgeRequests).toHaveLength(0);
  });

  test('TC4: Validate that "apply to all" skips every duplicated file at once and closes the dialog', async ({
    page,
  }) => {
    const drivePage = new DrivePage(page);
    const collisionDialog = new NameCollisionDialogPage(page);

    await drivePage.uploadFiles([duplicatedReport, duplicatedInvoice]);

    await collisionDialog.expectOpenFor('report.txt');
    await collisionDialog.checkApplyToAllByClickingLabel();
    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    await expect(drivePage.fileRow('report.txt')).toHaveCount(1);
    await expect(drivePage.fileRow('invoice.pdf')).toHaveCount(1);
    expect(trashRequests).toHaveLength(0);
    expect(bridgeRequests).toHaveLength(0);
  });

  test('TC5: Validate that replacing a duplicated file sends its matching existing file to trash', async ({ page }) => {
    const drivePage = new DrivePage(page);
    const collisionDialog = new NameCollisionDialogPage(page);

    await drivePage.uploadFiles([duplicatedInvoice]);

    await collisionDialog.expectOpenFor('invoice.pdf');
    await collisionDialog.selectOption(staticData.collisionReplaceOption);
    await collisionDialog.submit();

    await expect.poll(() => trashRequests.length, { timeout: 10000 }).toBe(1);
    expect(trashRequests[0].items).toEqual([{ uuid: existingInvoice.uuid, type: 'file' }]);
    await collisionDialog.expectClosed();
  });
});
