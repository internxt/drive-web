import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { AppError } from '@internxt/sdk';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import folderService from 'app/drive/services/folder.service';
import newStorageService from 'app/drive/services/new-storage.service';
import { HTTP_STATUS_CODES } from 'app/core/constants';
import { OwnerUserAuthenticationData } from 'app/network/types';
import DatabaseUploadRepository from 'app/repositories/DatabaseUploadRepository';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import {
  getCreatedFolder,
  getFileToUpload,
  getFolderToUpload,
  getUploadRepository,
} from 'testUtils/fixtures/upload.fixtures';
import { UPLOAD_ITEMS_LIMIT } from './uploadChecks';
import { UploadContext, uploadItems } from './uploadItems';

vi.mock('app/drive/services/file.service/uploadFile', () => ({ default: vi.fn() }));
vi.mock('app/network/networkInformation', () => ({ logNetworkInfoForUpload: vi.fn() }));

const DESTINATION_UUID = 'destination-uuid';
const MAX_FILE_SIZE = 100;
const noSpaceLeftError = new AppError('No space left', HTTP_STATUS_CODES.MAX_SPACE_USED);

const getUploadContext = (overrides: Partial<UploadContext> = {}): UploadContext => ({
  maxUploadFileSize: MAX_FILE_SIZE,
  planStorage: { limit: 0, usage: 0 },
  onUploadItemsLimitExceeded: vi.fn(),
  onFilesTooLarge: vi.fn(),
  onPlanLimitReached: vi.fn(),
  onNameCollisions: vi.fn(),
  onItemUploaded: vi.fn(),
  onItemRemoved: vi.fn(),
  onUploadFinished: vi.fn(),
  ...overrides,
});

const upload = (roots: ReturnType<typeof getFolderToUpload>[], files: File[], context = getUploadContext()) =>
  uploadItems({ destinationFolderUuid: DESTINATION_UUID, roots, files }, context);

const uploadedFiles = () =>
  vi.mocked(uploadFile).mock.calls.map(([file]) => ({ name: file.name, folder: file.parentFolderId }));

const createdFolders = () =>
  vi.mocked(folderService.createFolderByUuid).mock.calls.map(([parentUuid, name]) => ({ name, parent: parentUuid }));

const existingInDestination = ({ files = [], folders = [] }: { files?: string[]; folders?: string[] }) => {
  vi.spyOn(newStorageService, 'checkDuplicatedFiles').mockResolvedValue({
    existentFiles: files.map((name) => ({ plainName: name, type: 'pdf' })),
  } as never);
  vi.spyOn(newStorageService, 'checkDuplicatedFolders').mockResolvedValue({
    existentFolders: folders.map((name) => ({ plainName: name })),
  } as never);
};

describe('Uploading items into a folder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksService.clearTasks();
    vi.spyOn(errorService, 'reportError').mockReturnValue();
    vi.spyOn(referralService, 'trackFileUpload').mockReturnValue();
    vi.spyOn(referralService, 'trackFolderUpload').mockReturnValue();
    vi.spyOn(DatabaseUploadRepository, 'getInstance').mockReturnValue(getUploadRepository() as never);
    (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));
    vi.spyOn(folderService, 'createFolderByUuid').mockImplementation(
      (_parentUuid, name) => [Promise.resolve(getCreatedFolder(name)), { cancel: vi.fn() }] as never,
    );
    existingInDestination({});
  });

  test('When the items have no name conflicts, then they are uploaded into the folder and it is refreshed shortly after', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const context = getUploadContext();

    await upload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })],
      [getFileToUpload('report.pdf')],
      context,
    );
    vi.runAllTimers();
    vi.useRealTimers();

    expect(createdFolders()).toEqual([{ name: 'Photos', parent: DESTINATION_UUID }]);
    expect(uploadedFiles()).toEqual(
      expect.arrayContaining([
        { name: 'report', folder: DESTINATION_UUID },
        { name: 'beach', folder: 'Photos-uuid' },
      ]),
    );
    expect(context.onUploadFinished).toHaveBeenCalledWith(DESTINATION_UUID);
  });

  test('When some items already exist in the folder, then the user is asked how to resolve them and only the rest are uploaded', async () => {
    const context = getUploadContext();
    const [conflictingFile, newFile] = [getFileToUpload('report.pdf'), getFileToUpload('notes.txt')];
    existingInDestination({ files: ['report'] });

    await upload([], [conflictingFile, newFile], context);

    expect(context.onNameCollisions).toHaveBeenCalledWith([
      expect.objectContaining({ destinationUuid: DESTINATION_UUID, duplicatedItems: [conflictingFile] }),
    ]);
    expect(uploadedFiles()).toEqual([{ name: 'notes', folder: DESTINATION_UUID }]);
  });

  test('When every item already exists, then nothing is uploaded', async () => {
    existingInDestination({ files: ['report'], folders: ['Photos'] });

    await upload([getFolderToUpload('Photos')], [getFileToUpload('report.pdf')]);

    expect(createdFolders()).toEqual([]);
    expect(uploadedFiles()).toEqual([]);
  });

  test('When there are more files than the upload limit, then the user is warned and nothing is uploaded', async () => {
    const context = getUploadContext();
    const files = Array.from({ length: UPLOAD_ITEMS_LIMIT + 1 }, (_, index) => getFileToUpload(`${index}.txt`));

    await upload([], files, context);

    expect(context.onUploadItemsLimitExceeded).toHaveBeenCalled();
    expect(uploadedFiles()).toEqual([]);
  });

  test('When some files are too large, anywhere in the folders, then the user is told about all of them at once and the rest are uploaded', async () => {
    const context = getUploadContext();
    const [largeLooseFile, largeNestedFile] = [getFileToUpload('movie.mp4', 200), getFileToUpload('raw.mov', 200)];
    const videos = getFolderToUpload('Videos', {
      childrenFolders: [getFolderToUpload('Raw', { childrenFiles: [largeNestedFile] })],
    });

    await upload([videos], [largeLooseFile, getFileToUpload('notes.txt')], context);

    expect(context.onFilesTooLarge).toHaveBeenCalledWith([largeNestedFile, largeLooseFile]);
    expect(uploadedFiles()).toEqual([{ name: 'notes', folder: DESTINATION_UUID }]);
    expect(createdFolders()).toEqual([
      { name: 'Videos', parent: DESTINATION_UUID },
      { name: 'Raw', parent: 'Videos-uuid' },
    ]);
  });

  test('When a folder contains hidden files, then they are left out', async () => {
    await upload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('.DS_Store'), getFileToUpload('beach.png')] })],
      [],
    );

    expect(uploadedFiles()).toEqual([{ name: 'beach', folder: 'Photos-uuid' }]);
  });

  test('When there is not enough storage left, then the user is told and nothing is uploaded', async () => {
    const context = getUploadContext({ planStorage: { limit: 1000, usage: 995 } });

    await upload([getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png', 10)] })], [], context);

    expect(context.onPlanLimitReached).toHaveBeenCalled();
    expect(createdFolders()).toEqual([]);
    expect(uploadedFiles()).toEqual([]);
  });

  test('When uploading in a workspace, then the files are uploaded with the workspace credentials', async () => {
    const ownerUserAuthenticationData = { workspaceId: 'workspace-id' } as OwnerUserAuthenticationData;

    await upload([], [getFileToUpload('report.pdf')], getUploadContext({ ownerUserAuthenticationData }));

    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'report' }),
      expect.any(Function),
      expect.objectContaining({ isTeam: true, ownerUserAuthenticationData }),
      expect.any(Object),
    );
  });

  test('When items finish uploading, then the files are listed in their folder and only the folders created in the destination are listed', async () => {
    const context = getUploadContext();
    const photos = getFolderToUpload('Photos', {
      childrenFiles: [getFileToUpload('beach.png')],
      childrenFolders: [getFolderToUpload('Summer')],
    });

    await upload([photos], [], context);

    const listedItems = vi.mocked(context.onItemUploaded).mock.calls.map(([item, folderUuid]) => ({
      uuid: item.uuid,
      folderUuid,
    }));
    expect(listedItems).toEqual(
      expect.arrayContaining([
        { uuid: 'Photos-uuid', folderUuid: DESTINATION_UUID },
        { uuid: 'beach-uuid', folderUuid: 'Photos-uuid' },
      ]),
    );
    expect(listedItems).not.toContainEqual({ uuid: 'Summer-uuid', folderUuid: 'Photos-uuid' });
  });

  test('When the storage fills up while the items upload, then the user is told the plan limit was reached', async () => {
    const context = getUploadContext();
    (uploadFile as Mock).mockRejectedValue(noSpaceLeftError);

    await upload([], [getFileToUpload('report.pdf'), getFileToUpload('notes.txt')], context);

    expect(context.onPlanLimitReached).toHaveBeenCalledOnce();
  });
});
