import { expect, test } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildExistingFile, buildExistingFolder, ROOT_FOLDER_UUID } from '../helper/driveRouteMocks';
import { buildUploadFile, openMockedDrive } from '../helper/mockedDrive';
import { staticData } from '../helper/staticData';

const archive = buildExistingFolder(1, 'Archive');
const photos = buildExistingFolder(2, 'Photos');
const rootReport = buildExistingFile(1, 'report', 'txt');
const archivedReport = buildExistingFile(3, 'report', 'txt', archive.uuid);
const existingDrive = {
  files: [
    rootReport,
    buildExistingFile(2, 'invoice', 'pdf'),
    archivedReport,
    buildExistingFile(4, 'a', 'txt', photos.uuid),
  ],
  folders: [archive, photos, buildExistingFolder(3, 'Sub', photos.uuid)],
};

/**
 * A local "Photos" folder that partially overlaps with the existing one:
 * Photos/a.txt (exists), Photos/b.txt (new), Photos/Sub/c.txt (Sub exists, c.txt is new),
 * Photos/New/d.txt (New is new).
 */
const createPhotosDirectory = () => {
  const root = mkdtempSync(join(tmpdir(), 'collision-'));
  const photosPath = join(root, 'Photos');
  mkdirSync(join(photosPath, 'Sub'), { recursive: true });
  mkdirSync(join(photosPath, 'New'), { recursive: true });
  writeFileSync(join(photosPath, 'a.txt'), 'a');
  writeFileSync(join(photosPath, 'b.txt'), 'b');
  writeFileSync(join(photosPath, 'Sub', 'c.txt'), 'c');
  writeFileSync(join(photosPath, 'New', 'd.txt'), 'd');
  return { root, photosPath };
};

test.describe('Internxt name collision resolutions', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC1: Validate that keeping both on a duplicated file uploads it under a numbered name', async ({ page }) => {
    const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

    await drivePage.uploadFiles([buildUploadFile('report.txt')]);
    await collisionDialog.resolve('report.txt', staticData.collisionKeepBothOption);

    await expect(drivePage.taskItem('report (1).txt')).toBeVisible({ timeout: 10000 });
    await collisionDialog.expectClosed();
    expect(requests.trash).toHaveLength(0);
  });

  test.describe('Folder uploads', () => {
    let directory: ReturnType<typeof createPhotosDirectory>;

    test.beforeAll(() => {
      directory = createPhotosDirectory();
    });

    test.afterAll(() => {
      rmSync(directory.root, { recursive: true, force: true });
    });

    test('TC2: Validate that keeping both on a duplicated folder creates it under a numbered name', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

      await drivePage.uploadFolder(directory.photosPath);
      await collisionDialog.resolve('Photos', staticData.collisionKeepBothOption);

      await expect
        .poll(() => requests.createdFolders, { timeout: 10000 })
        .toContainEqual({
          plainName: 'Photos (1)',
          parentFolderUuid: ROOT_FOLDER_UUID,
        });
      expect(requests.trash).toHaveLength(0);
    });

    test('TC3: Validate that replacing a duplicated folder trashes the existing one before creating the new one', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

      await drivePage.uploadFolder(directory.photosPath);
      await collisionDialog.resolve('Photos', staticData.collisionReplaceOption);

      await expect
        .poll(() => requests.createdFolders, { timeout: 10000 })
        .toContainEqual({
          plainName: 'Photos',
          parentFolderUuid: ROOT_FOLDER_UUID,
        });
      expect(requests.trash).toEqual([{ items: [{ uuid: photos.uuid, type: 'folder' }] }]);
    });

    test('TC4: Validate that skipping a duplicated folder merges only its new content into the existing folder', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

      await drivePage.uploadFolder(directory.photosPath);
      await collisionDialog.resolve('Photos', staticData.collisionSkipOption);

      await expect(drivePage.taskItem('b.txt')).toBeVisible({ timeout: 10000 });
      await expect(drivePage.taskItem('c.txt')).toBeVisible({ timeout: 10000 });
      await expect
        .poll(() => requests.createdFolders, { timeout: 10000 })
        .toEqual([{ plainName: 'New', parentFolderUuid: photos.uuid }]);
      await expect(drivePage.taskItem('a.txt')).toHaveCount(0);
      expect(requests.trash).toHaveLength(0);
    });
  });

  test.describe('Move collisions', () => {
    test('TC5: Validate that replacing a moved file trashes the file it collides with in the destination', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

      await drivePage.dragItemToFolder('report.txt', 'Archive');
      await collisionDialog.resolve('report', staticData.collisionReplaceOption);

      await collisionDialog.expectClosed();
      await expect
        .poll(() => requests.moves, { timeout: 10000 })
        .toEqual([{ uuid: rootReport.uuid, destinationFolder: archive.uuid }]);
      expect(requests.trash).toEqual([{ items: [{ uuid: archivedReport.uuid, type: 'file' }] }]);
    });

    test('TC6: Validate that keeping both on a moved file moves it under a numbered name', async ({ page }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

      await drivePage.dragItemToFolder('report.txt', 'Archive');
      await collisionDialog.resolve('report', staticData.collisionKeepBothOption);

      await collisionDialog.expectClosed();
      await expect
        .poll(() => requests.moves, { timeout: 10000 })
        .toEqual([{ uuid: rootReport.uuid, destinationFolder: archive.uuid, name: 'report (1)' }]);
      expect(requests.trash).toHaveLength(0);
    });

    test('TC7: Validate that skipping a moved file leaves both files where they are', async ({ page }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, existingDrive);

      await drivePage.dragItemToFolder('report.txt', 'Archive');
      await collisionDialog.resolve('report', staticData.collisionSkipOption);

      await collisionDialog.expectClosed();
      await expect(drivePage.fileRow('report.txt')).toHaveCount(1);
      expect(requests.moves).toHaveLength(0);
      expect(requests.trash).toHaveLength(0);
    });
  });

  test('TC8: Validate that replacing a versionable file uploads a new version instead of trashing it', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Bridge requests can only be intercepted in Chromium');
    const { drivePage, collisionDialog, requests } = await openMockedDrive(page, {
      ...existingDrive,
      isVersioningEnabled: true,
    });

    await drivePage.uploadFiles([buildUploadFile('invoice.pdf')]);
    await collisionDialog.resolve('invoice.pdf', staticData.collisionReplaceOption);

    await expect.poll(() => requests.bridge.length, { timeout: 15000 }).toBeGreaterThan(0);
    expect(requests.trash).toHaveLength(0);
  });
});
