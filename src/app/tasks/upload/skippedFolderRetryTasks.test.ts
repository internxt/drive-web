import { describe, expect, test } from 'vitest';
import { RetryableTaskType } from 'app/network/RetryManager';
import { IRoot } from 'app/store/slices/storage/types';
import { buildSkippedFolderRetryTasks } from './skippedFolderRetryTasks';

const folderTaskId = 'folder-task';
const nearestFolderId = 'nearest-uuid';
const maxUploadFileSize = 100;

const buildFolder = (name: string, childrenFiles: File[], childrenFolders: IRoot[] = []): IRoot => ({
  name,
  folderId: null,
  childrenFiles,
  childrenFolders,
  isFolder: true,
});

const makefile = new File(['make'], 'Makefile');
const pdf = new File(['pdf'], 'b.pdf');
const nestedSkippedFolder = buildFolder('Broken', [makefile], [buildFolder('Deep', [pdf])]);

const buildRetryTasks = (skippedFolder: IRoot) =>
  buildSkippedFolderRetryTasks({
    skippedFolder: { ...skippedFolder, folderId: nearestFolderId },
    folderTaskId,
    maxUploadFileSize,
  });

describe('skippedFolderRetryTasks', () => {
  test('when a subfolder with nested folders is skipped, then every file under it is listed as a failed upload of the folder task', () => {
    const tasks = buildRetryTasks(nestedSkippedFolder);

    const failedUploadOfFolderTask = expect.objectContaining({
      type: RetryableTaskType.Upload,
      params: expect.objectContaining({ relatedTaskId: folderTaskId }),
    });

    expect(tasks).toEqual([failedUploadOfFolderTask, failedUploadOfFolderTask]);
    expect(tasks[0].taskId).not.toBe(tasks[1].taskId);
  });

  test('when a skipped file is listed, then it starts from the nearest existing folder and keeps the folders missing down to its own', () => {
    const tasks = buildRetryTasks(nestedSkippedFolder);

    expect(tasks.map(({ params }) => params)).toEqual([
      expect.objectContaining({
        parentFolderId: nearestFolderId,
        missingFolderPath: ['Broken'],
        filecontent: {
          name: 'Makefile',
          type: '',
          size: makefile.size,
          content: makefile,
          parentFolderId: nearestFolderId,
        },
      }),
      expect.objectContaining({
        parentFolderId: nearestFolderId,
        missingFolderPath: ['Broken', 'Deep'],
        filecontent: { name: 'b', type: 'pdf', size: pdf.size, content: pdf, parentFolderId: nearestFolderId },
      }),
    ]);
  });

  test('when a skipped subfolder has hidden or oversized files, then they are not listed for retry', () => {
    const kept = new File(['kept'], 'kept.txt');
    const oversized = new File([new ArrayBuffer(maxUploadFileSize + 1)], 'big.mp4');

    const tasks = buildRetryTasks(buildFolder('Broken', [new File(['x'], '.DS_Store'), oversized, kept]));

    expect(tasks.map(({ params }) => params.filecontent.content)).toEqual([kept]);
  });
});
