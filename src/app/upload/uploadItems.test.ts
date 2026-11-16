import { describe, expect, Mock, test, vi } from 'vitest';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import folderService from 'app/drive/services/folder.service';
import { DriveItemData } from 'app/drive/types';
import { OwnerUserAuthenticationData } from 'app/network/types';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import workspacesService from 'services/workspace.service';
import {
  getCreatedFolder,
  getFileToUpload,
  getFolderToUpload,
  getFolderWithFiles,
  getUploadRepository,
} from 'testUtils/fixtures/upload.fixtures';
import { UPLOAD_ITEMS_LIMIT, UploadContext, uploadItems } from './uploadItems';

vi.mock('app/drive/services/file.service/uploadFile', () => ({ default: vi.fn() }));
vi.mock('app/drive/services/folder.service', () => ({ default: { createFolderByUuid: vi.fn() } }));
vi.mock('services/workspace.service', () => ({ default: { createFolder: vi.fn() } }));
vi.mock('app/drive/services/new-storage.service', () => ({ default: { deleteFolderByUuid: vi.fn() } }));
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn(),
  handleRepeatedUploadingFolders: vi.fn(),
}));
vi.mock('services/referral.service', () => ({ default: { trackFileUpload: vi.fn(), trackFolderUpload: vi.fn() } }));
vi.mock('app/network/networkInformation', () => ({ logNetworkInfoForUpload: vi.fn() }));
vi.mock('i18next', () => ({ t: (key: string) => key }));

const DESTINATION_UUID = 'destination-uuid';
const MAX_FILE_SIZE = 100;

const getUploadContext = (overrides: Partial<UploadContext> = {}): UploadContext => ({
  uploadRepository: getUploadRepository(),
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

const anExistingItem = (name: string) => ({ name, uuid: `existing-${name}-uuid` }) as unknown as DriveItemData;

const inTheDestinationAlreadyExist = (existingNames: string[]) => {
  const splitByName = async <T extends { name: string }>(items: T[]) => ({
    repeatedItems: items.filter(({ name }) => existingNames.includes(name)),
    existingItems: existingNames.map(anExistingItem),
    unrepeatedItems: items.filter(({ name }) => !existingNames.includes(name)),
  });
  vi.mocked(handleRepeatedUploadingFiles).mockImplementation(splitByName as never);
  vi.mocked(handleRepeatedUploadingFolders).mockImplementation(splitByName as never);
};

const nothingExistsInTheDestination = () => inTheDestinationAlreadyExist([]);

const uploadsSucceed = () => {
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));
  const createFolder = (_parentUuid: string, name: string) =>
    [Promise.resolve(getCreatedFolder(name)), { cancel: vi.fn() }] as never;
  vi.mocked(folderService.createFolderByUuid).mockImplementation(createFolder);
  vi.mocked(workspacesService.createFolder).mockImplementation(({ plainName }) => createFolder('', plainName));
};

const upload = (roots: ReturnType<typeof getFolderToUpload>[], files: File[], context = getUploadContext()) =>
  uploadItems({ destinationFolderUuid: DESTINATION_UUID, roots, files }, context);

const uploadedFileNames = () => vi.mocked(uploadFile).mock.calls.map(([file]) => file.name);
const createdFolders = () =>
  vi.mocked(folderService.createFolderByUuid).mock.calls.map(([parentUuid, name]) => ({ parentUuid, name }));

describe('Uploading items into a folder', () => {
  const prepare = () => {
    nothingExistsInTheDestination();
    uploadsSucceed();
  };

  test('When the items have no name conflicts, then they are uploaded into the folder and it is refreshed afterwards', async () => {
    prepare();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const context = getUploadContext();

    const uploading = upload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('beach.png')] })],
      [getFileToUpload('report.pdf')],
      context,
    );
    await vi.runAllTimersAsync();
    await uploading;
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(createdFolders()).toEqual([{ parentUuid: DESTINATION_UUID, name: 'Photos' }]);
    expect(uploadedFileNames().sort()).toEqual(['beach', 'report']);
    expect(context.onUploadFinished).toHaveBeenCalledWith(DESTINATION_UUID);
  });

  test('When items are uploaded, then the folder shows the uploaded file and folder but not the subfolders inside them', async () => {
    prepare();
    const context = getUploadContext();

    await upload(
      [getFolderToUpload('Photos', { childrenFolders: [getFolderToUpload('Summer')] })],
      [getFileToUpload('report.pdf')],
      context,
    );

    const shownItems = vi.mocked(context.onItemUploaded).mock.calls.map(([item, parentUuid]) => ({
      uuid: item.uuid,
      parentUuid,
    }));
    expect(shownItems).toEqual(
      expect.arrayContaining([
        { uuid: 'Photos-uuid', parentUuid: DESTINATION_UUID },
        { uuid: 'report-uuid', parentUuid: DESTINATION_UUID },
      ]),
    );
    expect(shownItems).not.toContainEqual(expect.objectContaining({ uuid: 'Summer-uuid' }));
  });

  test('When some items already exist in the folder, then they go to the name collision dialog and the rest is uploaded', async () => {
    prepare();
    inTheDestinationAlreadyExist(['report.pdf']);
    const context = getUploadContext();
    const repeated = getFileToUpload('report.pdf');

    await upload([], [repeated, getFileToUpload('invoice.pdf')], context);

    expect(context.onNameCollisions).toHaveBeenCalledWith([
      expect.objectContaining({ destinationUuid: DESTINATION_UUID, duplicatedItems: [repeated] }),
    ]);
    expect(uploadedFileNames()).toEqual(['invoice']);
  });

  test('When every item already exists in the folder, then nothing is uploaded', async () => {
    prepare();
    inTheDestinationAlreadyExist(['Photos']);
    const context = getUploadContext();

    await upload([getFolderToUpload('Photos')], [], context);

    expect(context.onNameCollisions).toHaveBeenCalled();
    expect(folderService.createFolderByUuid).not.toHaveBeenCalled();
  });

  test('When the user picks more files than the limit, then they are told and nothing is checked or uploaded', async () => {
    prepare();
    const context = getUploadContext();
    const tooManyFiles = Array.from({ length: UPLOAD_ITEMS_LIMIT + 1 }, (_, index) => getFileToUpload(`${index}.txt`));

    await upload([], tooManyFiles, context);

    expect(context.onUploadItemsLimitExceeded).toHaveBeenCalledOnce();
    expect(handleRepeatedUploadingFiles).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  test('When some files are too large, then the user is told which ones and the rest is uploaded', async () => {
    prepare();
    const context = getUploadContext();
    const tooLarge = getFileToUpload('movie.mp4', MAX_FILE_SIZE + 1);
    const tooLargeInsideFolder = getFileToUpload('trailer.mp4', MAX_FILE_SIZE + 1);

    await upload(
      [getFolderToUpload('Videos', { childrenFiles: [tooLargeInsideFolder, getFileToUpload('cover.png')] })],
      [tooLarge, getFileToUpload('report.pdf')],
      context,
    );

    expect(context.onFilesTooLarge).toHaveBeenCalledWith(expect.arrayContaining([tooLarge, tooLargeInsideFolder]));
    expect(uploadedFileNames().sort()).toEqual(['cover', 'report']);
  });

  test('When a folder only has files that are too large, then nothing of its uploaded folder is created and the rest is uploaded', async () => {
    prepare();
    const context = getUploadContext();
    const tooLarge = getFileToUpload('movie.mp4', MAX_FILE_SIZE + 1);
    const videos = getFolderToUpload('Videos', { childrenFiles: [tooLarge] });
    const trip = getFolderToUpload('Trip', {
      childrenFiles: [getFileToUpload('map.png')],
      childrenFolders: [videos],
    });

    await upload([trip, getFolderWithFiles('Docs', ['report.pdf'])], [getFileToUpload('notes.txt')], context);

    expect(context.onFilesTooLarge).toHaveBeenCalledWith([tooLarge]);
    expect(createdFolders()).toEqual([{ parentUuid: DESTINATION_UUID, name: 'Docs' }]);
    expect(uploadedFileNames().sort()).toEqual(['notes', 'report']);
  });

  test('When a folder has hidden files inside, then they are not uploaded', async () => {
    prepare();

    await upload(
      [getFolderToUpload('Photos', { childrenFiles: [getFileToUpload('.DS_Store'), getFileToUpload('beach.png')] })],
      [],
    );

    expect(uploadedFileNames()).toEqual(['beach']);
  });

  test('When the items do not fit in the storage left, then the user is told and nothing is uploaded', async () => {
    prepare();
    const context = getUploadContext({ planStorage: { limit: 100, usage: 95 } });

    await upload([], [getFileToUpload('report.pdf', 10)], context);

    expect(context.onPlanLimitReached).toHaveBeenCalledOnce();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  test('When uploading into a workspace, then the workspace credentials are used', async () => {
    prepare();
    const ownerUserAuthenticationData = {
      workspaceId: 'workspace-id',
      bucketId: 'workspace-bucket',
    } as OwnerUserAuthenticationData;

    await upload(
      [getFolderToUpload('Photos')],
      [getFileToUpload('report.pdf')],
      getUploadContext({
        ownerUserAuthenticationData,
      }),
    );

    expect(workspacesService.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'workspace-id', parentFolderUuid: DESTINATION_UUID, plainName: 'Photos' }),
    );
    expect(vi.mocked(uploadFile).mock.calls[0][2]).toEqual(expect.objectContaining({ ownerUserAuthenticationData }));
  });
});
