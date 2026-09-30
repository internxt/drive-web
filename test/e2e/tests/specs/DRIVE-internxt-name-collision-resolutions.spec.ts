import { expect, test } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildExistingFile,
  buildExistingFolder,
  buildTrashedFile,
  failMovesOf,
  MoveRequest,
  ROOT_FOLDER_UUID,
  TrashedFile,
  TrashRequest,
} from '../helper/driveRouteMocks';
import { buildUploadFile, openMockedDrive } from '../helper/mockedDrive';
import { staticData } from '../helper/staticData';
import { DrivePage } from '../pages/drivePage';

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

const archivedOther = buildExistingFile(5, 'other', 'txt', archive.uuid);
const trashedReport = buildTrashedFile(10, 'report', 'txt', archive.uuid);
const trashedReportCopy = buildTrashedFile(11, 'report', 'txt', archive.uuid);
const trashedOther = buildTrashedFile(12, 'other', 'txt', archive.uuid);

/**
 * Archive holds report.txt and other.txt; the trash holds two report.txt and one other.txt deleted from it.
 * Versioning is on only to keep the Playwright UI snapshots clean (see runbook §9, "Locked feature").
 */
const driveWithTrash = {
  files: [...existingDrive.files, archivedOther],
  folders: existingDrive.folders,
  trashedFiles: [trashedReport, trashedReportCopy, trashedOther],
  isVersioningEnabled: true,
};

/** Archive holds one report.txt; the trash holds two report.txt deleted from it and nothing else collides. */
const driveWithSameNameTrash = {
  ...driveWithTrash,
  files: existingDrive.files,
  trashedFiles: [trashedReport, trashedReportCopy],
};

const getTrashedUuids = (trashRequests: TrashRequest[]) =>
  trashRequests.flatMap((trashRequest) => trashRequest.items.map((item) => item.uuid));

const archivedReportTrashedOnce: TrashRequest[] = [{ items: [{ uuid: archivedReport.uuid, type: 'file' }] }];

const buildMoveToArchive = (trashedFile: TrashedFile, newName?: string): MoveRequest => {
  const move = { uuid: trashedFile.uuid, destinationFolder: archive.uuid };
  return newName ? { ...move, name: newName } : move;
};

/** Reloads both lists from the server the way a user would: Drive → Archive, then back to the trash. */
const expectArchiveAndTrash = async (
  drivePage: DrivePage,
  { archiveItems, trashItems }: { archiveItems: string[]; trashItems: string[] },
) => {
  await drivePage.openFolderFromDrive(archive.plainName);
  await drivePage.expectListedItems(archiveItems);

  await drivePage.reopenTrash();
  await drivePage.expectListedItems(trashItems);
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

  test.describe('Restore collisions', () => {
    test('TC9: Validate that keeping both on every restored file gives each same-name file its own numbered name', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, driveWithTrash);

      await drivePage.openTrash();
      await expect(drivePage.fileRow('report.txt')).toHaveCount(2);
      await drivePage.selectAllItems();
      await drivePage.restoreSelectedItems();

      await collisionDialog.expectOpenFor('report');
      await collisionDialog.checkApplyToAllByClickingLabel();
      await collisionDialog.selectOption(staticData.collisionKeepBothOption);
      await collisionDialog.submit();

      await collisionDialog.expectClosed();
      await expect.poll(() => requests.moves, { timeout: 10000 }).toHaveLength(3);
      expect(requests.moves).toEqual(
        expect.arrayContaining([
          { uuid: trashedReport.uuid, destinationFolder: archive.uuid, name: 'report (1)' },
          { uuid: trashedReportCopy.uuid, destinationFolder: archive.uuid, name: 'report (2)' },
          { uuid: trashedOther.uuid, destinationFolder: archive.uuid, name: 'other (1)' },
        ]),
      );
      expect(requests.trash).toHaveLength(0);
      await drivePage.expectListedItems([]);

      await drivePage.openFolderFromDrive(archive.plainName);
      await drivePage.expectListedItems([
        'report.txt',
        'report (1).txt',
        'report (2).txt',
        'other.txt',
        'other (1).txt',
      ]);
    });

    test('TC10: Validate that replacing with every restored file trashes each existing file once and keeps the second same-name file under a numbered name', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, driveWithTrash);

      await drivePage.openTrash();
      await expect(drivePage.fileRow('report.txt')).toHaveCount(2);
      await drivePage.selectAllItems();
      await drivePage.restoreSelectedItems();

      await collisionDialog.expectOpenFor('report');
      await collisionDialog.checkApplyToAllByClickingLabel();
      await collisionDialog.selectOption(staticData.collisionReplaceOption);
      await collisionDialog.submit();

      await collisionDialog.expectClosed();
      await expect.poll(() => requests.moves, { timeout: 10000 }).toHaveLength(3);

      const trashedUuids = getTrashedUuids(requests.trash);
      expect(trashedUuids).toHaveLength(2);
      expect(trashedUuids).toEqual(expect.arrayContaining([archivedReport.uuid, archivedOther.uuid]));

      const [firstMove, secondMove, lastMove] = requests.moves;
      expect([firstMove, secondMove]).toEqual(
        expect.arrayContaining([
          { uuid: trashedReport.uuid, destinationFolder: archive.uuid },
          { uuid: trashedOther.uuid, destinationFolder: archive.uuid },
        ]),
      );
      expect(lastMove).toEqual({ uuid: trashedReportCopy.uuid, destinationFolder: archive.uuid, name: 'report (1)' });
      await drivePage.expectListedItems([]);

      await drivePage.openFolderFromDrive(archive.plainName);
      await drivePage.expectListedItems(['report.txt', 'report (1).txt', 'other.txt']);

      await drivePage.reopenTrash();
      await drivePage.expectListedItems(['report.txt', 'other.txt']);
    });

    test('TC11: Validate that a restored file whose move fails stays in the trash while the moved one leaves it', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, {
        ...driveWithTrash,
        trashedFiles: [trashedReport, trashedOther],
      });
      const rejectedMoves = await failMovesOf(page, trashedOther);

      await drivePage.openTrash();
      await expect(drivePage.fileRow('report.txt')).toHaveCount(1);
      await expect(drivePage.fileRow('other.txt')).toHaveCount(1);
      await drivePage.selectAllItems();
      await drivePage.restoreSelectedItems();

      await collisionDialog.expectOpenFor('report');
      await collisionDialog.checkApplyToAllByClickingLabel();
      await collisionDialog.selectOption(staticData.collisionKeepBothOption);
      await collisionDialog.submit();

      await collisionDialog.expectClosed();
      await expect
        .poll(() => rejectedMoves, { timeout: 10000 })
        .toEqual([{ uuid: trashedOther.uuid, destinationFolder: archive.uuid, name: 'other (1)' }]);
      await drivePage.expectListedItems(['other.txt']);
      expect(requests.moves).toEqual([
        { uuid: trashedReport.uuid, destinationFolder: archive.uuid, name: 'report (1)' },
      ]);

      await drivePage.openFolderFromDrive(archive.plainName);
      await drivePage.expectListedItems(['report.txt', 'report (1).txt', 'other.txt']);
      await expect(drivePage.itemRow('other (1).txt')).toHaveCount(0);
    });

    test('TC12: Validate that replacing with two same-name restored files one at a time trashes the existing file only once', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, driveWithSameNameTrash);
      const replacingMove = buildMoveToArchive(trashedReport);
      const numberedMove = buildMoveToArchive(trashedReportCopy, 'report (1)');

      await drivePage.restoreAllFromTrash(['report.txt', 'report.txt']);
      await collisionDialog.expectApplyToAllVisible(true);
      await collisionDialog.resolve('report', staticData.collisionReplaceOption);
      await expect.poll(() => requests.moves, { timeout: 10000 }).toEqual([replacingMove]);
      expect(requests.trash).toEqual(archivedReportTrashedOnce);

      await collisionDialog.resolveLastItem(staticData.collisionReplaceOption);
      await collisionDialog.expectClosed();
      await expect.poll(() => requests.moves, { timeout: 10000 }).toEqual([replacingMove, numberedMove]);
      expect(requests.trash).toEqual(archivedReportTrashedOnce);

      await drivePage.expectListedItems([]);
      await expectArchiveAndTrash(drivePage, {
        archiveItems: ['report.txt', 'report (1).txt'],
        trashItems: ['report.txt'],
      });
    });

    test('TC13: Validate that replacing after keeping both on a same-name restored file still trashes the existing file', async ({
      page,
    }) => {
      const { drivePage, collisionDialog, requests } = await openMockedDrive(page, driveWithSameNameTrash);
      const numberedMove = buildMoveToArchive(trashedReport, 'report (1)');
      const replacingMove = buildMoveToArchive(trashedReportCopy);

      await drivePage.restoreAllFromTrash(['report.txt', 'report.txt']);
      await collisionDialog.resolve('report', staticData.collisionKeepBothOption);
      await expect.poll(() => requests.moves, { timeout: 10000 }).toEqual([numberedMove]);
      expect(requests.trash).toHaveLength(0);

      await collisionDialog.resolveLastItem(staticData.collisionReplaceOption);
      await collisionDialog.expectClosed();
      await expect.poll(() => requests.moves, { timeout: 10000 }).toEqual([numberedMove, replacingMove]);
      expect(requests.trash).toEqual(archivedReportTrashedOnce);

      await drivePage.expectListedItems([]);
      await expectArchiveAndTrash(drivePage, {
        archiveItems: ['report.txt', 'report (1).txt'],
        trashItems: ['report.txt'],
      });
    });
  });
});
