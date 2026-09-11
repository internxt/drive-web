import { expect, test } from '@playwright/test';
import { buildExistingFile } from '../helper/driveRouteMocks';
import { buildUploadFile, openMockedDrive } from '../helper/mockedDrive';
import { staticData } from '../helper/staticData';

const existingReport = buildExistingFile(1, 'report', 'txt');
const existingInvoice = buildExistingFile(2, 'invoice', 'pdf');

const duplicatedReport = buildUploadFile('report.txt');
const duplicatedInvoice = buildUploadFile('invoice.pdf');
const newFile = buildUploadFile('brand-new.txt');

const allOptions = [
  staticData.collisionReplaceOption,
  staticData.collisionKeepBothOption,
  staticData.collisionSkipOption,
];

test.describe('Internxt name collision skip option', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let drive: Awaited<ReturnType<typeof openMockedDrive>>;

  test.beforeEach('Logging in with existing files in Drive', async ({ page }) => {
    drive = await openMockedDrive(page, [existingReport, existingInvoice]);
  });

  test('TC1: Validate that skipping a single duplicated file keeps the existing file and uploads nothing', async () => {
    const { drivePage, collisionDialog, requests } = drive;

    await drivePage.uploadFiles([duplicatedReport]);

    await collisionDialog.expectOpenFor('report.txt');
    await collisionDialog.expectOptions(allOptions);
    await collisionDialog.expectApplyToAllVisible(false);

    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    await expect(drivePage.fileRow('report.txt')).toHaveCount(1);
    expect(requests.trash).toHaveLength(0);
    expect(requests.bridge).toHaveLength(0);
  });

  test('TC2: Validate that only the non-conflicting files are uploaded when the duplicated one is skipped', async () => {
    const { drivePage, collisionDialog, requests } = drive;

    await drivePage.uploadFiles([duplicatedReport, newFile]);

    await collisionDialog.expectOpenFor('report.txt');
    await expect(drivePage.taskItem('brand-new.txt')).toBeVisible({ timeout: 10000 });

    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    expect(requests.trash).toHaveLength(0);
  });

  test('TC3: Validate that duplicated files are resolved one by one when "apply to all" is not checked', async () => {
    const { drivePage, collisionDialog, requests } = drive;

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
    expect(requests.trash).toHaveLength(0);
    expect(requests.bridge).toHaveLength(0);
  });

  test('TC4: Validate that "apply to all" skips every duplicated file at once and closes the dialog', async () => {
    const { drivePage, collisionDialog, requests } = drive;

    await drivePage.uploadFiles([duplicatedReport, duplicatedInvoice]);

    await collisionDialog.expectOpenFor('report.txt');
    await collisionDialog.checkApplyToAllByClickingLabel();
    await collisionDialog.selectOption(staticData.collisionSkipOption);
    await collisionDialog.submit();

    await collisionDialog.expectClosed();
    await expect(drivePage.fileRow('report.txt')).toHaveCount(1);
    await expect(drivePage.fileRow('invoice.pdf')).toHaveCount(1);
    expect(requests.trash).toHaveLength(0);
    expect(requests.bridge).toHaveLength(0);
  });

  test('TC5: Validate that replacing a duplicated file sends its matching existing file to trash', async () => {
    const { drivePage, collisionDialog, requests } = drive;

    await drivePage.uploadFiles([duplicatedInvoice]);
    await collisionDialog.resolve('invoice.pdf', staticData.collisionReplaceOption);

    await expect
      .poll(() => requests.trash, { timeout: 10000 })
      .toEqual([{ items: [{ uuid: existingInvoice.uuid, type: 'file' }] }]);
    await collisionDialog.expectClosed();
  });
});
