import { describe, expect, Mock, test, vi } from 'vitest';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import folderService from 'app/drive/services/folder.service';
import { OwnerUserAuthenticationData } from 'app/network/types';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import workspacesService from 'services/workspace.service';
import {
  getCreatedFolderRequest,
  getFileToUpload,
  getFolderToUpload,
  getFolderWithFiles,
  getUploadContext,
  MAX_UPLOAD_FILE_SIZE,
  splitByExistingNames,
} from 'testUtils/fixtures/upload.fixtures';
import { UPLOAD_ITEMS_LIMIT, uploadItems } from './uploadItems';

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

const inTheDestinationAlreadyExist = (existingNames: string[]) => {
  vi.mocked(handleRepeatedUploadingFiles).mockImplementation(splitByExistingNames(existingNames) as never);
  vi.mocked(handleRepeatedUploadingFolders).mockImplementation(splitByExistingNames(existingNames) as never);
};

const nothingExistsInTheDestination = () => inTheDestinationAlreadyExist([]);

const uploadsSucceed = () => {
  (uploadFile as Mock).mockImplementation(async (file: { name: string }) => ({ uuid: `${file.name}-uuid` }));
  vi.mocked(folderService.createFolderByUuid).mockImplementation((_parentUuid, name) => getCreatedFolderRequest(name));
  vi.mocked(workspacesService.createFolder).mockImplementation(({ plainName }) => getCreatedFolderRequest(plainName));
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

  test('When both files and folders already exist in the folder, then the dialog shows a group for each', async () => {
    prepare();
    inTheDestinationAlreadyExist(['report.pdf', 'Photos']);
    const context = getUploadContext();
    const repeatedFile = getFileToUpload('report.pdf');
    const repeatedFolder = getFolderToUpload('Photos');

    await upload([repeatedFolder], [repeatedFile], context);

    expect(context.onNameCollisions).toHaveBeenCalledOnce();
    expect(context.onNameCollisions).toHaveBeenCalledWith([
      expect.objectContaining({ duplicatedItems: [repeatedFile] }),
      expect.objectContaining({ duplicatedItems: [repeatedFolder] }),
    ]);
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

  test('When the user picks exactly as many files as the limit, then they are uploaded', async () => {
    prepare();
    const context = getUploadContext();
    const filesAtTheLimit = Array.from({ length: UPLOAD_ITEMS_LIMIT }, (_, index) => getFileToUpload(`${index}.txt`));

    await upload([], filesAtTheLimit, context);

    expect(context.onUploadItemsLimitExceeded).not.toHaveBeenCalled();
    expect(uploadFile).toHaveBeenCalledTimes(UPLOAD_ITEMS_LIMIT);
  });

  test('When some files are too large, then the user is told which ones and the rest is uploaded', async () => {
    prepare();
    const context = getUploadContext();
    const tooLarge = getFileToUpload('movie.mp4', MAX_UPLOAD_FILE_SIZE + 1);
    const tooLargeInsideFolder = getFileToUpload('trailer.mp4', MAX_UPLOAD_FILE_SIZE + 1);

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
    const tooLarge = getFileToUpload('movie.mp4', MAX_UPLOAD_FILE_SIZE + 1);
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
