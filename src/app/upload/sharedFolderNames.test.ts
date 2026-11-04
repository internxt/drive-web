import { beforeEach, describe, expect, test, vi } from 'vitest';
import shareService from 'app/share/services/share.service';
import workspacesService from 'services/workspace.service';
import { getFileToUpload } from 'testUtils/fixtures/upload.fixtures';
import { renameToFreeNamesInSharedFolder } from './sharedFolderNames';

vi.mock('app/share/services/share.service', () => ({ default: { getSharedFolderContent: vi.fn() } }));
vi.mock('services/workspace.service', () => ({ default: { getAllWorkspaceTeamSharedFolderFiles: vi.fn() } }));

const SHARED_FOLDER = { uuid: 'shared-folder-uuid', resourcesToken: 'resources-token' };

const aSharedFile = (plainName: string, type: string) => ({ plainName, type });

const sharedFolderContains = (...pages: ReturnType<typeof aSharedFile>[][]) =>
  pages.forEach((items) => vi.mocked(shareService.getSharedFolderContent).mockResolvedValueOnce({ items } as never));

const namesOf = (files: File[]) => files.map((file) => file.name);

describe('Naming files uploaded to a shared folder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a name is already taken in the shared folder, then the file gets the next free name', async () => {
    sharedFolderContains([aSharedFile('report', 'pdf')]);

    const files = await renameToFreeNamesInSharedFolder([getFileToUpload('report.pdf')], SHARED_FOLDER);

    expect(namesOf(files)).toEqual(['report (1).pdf']);
  });

  test('When the name is free, then the file keeps it', async () => {
    sharedFolderContains([aSharedFile('report', 'pdf')]);

    const files = await renameToFreeNamesInSharedFolder([getFileToUpload('invoice.pdf')], SHARED_FOLDER);

    expect(namesOf(files)).toEqual(['invoice.pdf']);
  });

  test('When several uploaded files share a name, then each one gets its own free name', async () => {
    sharedFolderContains([]);

    const files = await renameToFreeNamesInSharedFolder(
      [getFileToUpload('report.pdf'), getFileToUpload('report.pdf')],
      SHARED_FOLDER,
    );

    expect(namesOf(files)).toEqual(['report.pdf', 'report (1).pdf']);
  });

  test('When the shared folder has many files, then every page is checked', async () => {
    const fullPage = Array.from({ length: 50 }, (_, index) => aSharedFile(`file-${index}`, 'txt'));
    sharedFolderContains(fullPage, [aSharedFile('report', 'pdf')]);

    const files = await renameToFreeNamesInSharedFolder([getFileToUpload('report.pdf')], SHARED_FOLDER);

    expect(shareService.getSharedFolderContent).toHaveBeenCalledTimes(2);
    expect(namesOf(files)).toEqual(['report (1).pdf']);
  });

  test('When the shared folder belongs to a workspace, then its files are listed through the workspace', async () => {
    vi.mocked(workspacesService.getAllWorkspaceTeamSharedFolderFiles).mockReturnValue([
      Promise.resolve({ items: [aSharedFile('report', 'pdf')] }),
      { cancel: vi.fn() },
    ] as never);

    const files = await renameToFreeNamesInSharedFolder([getFileToUpload('report.pdf')], {
      ...SHARED_FOLDER,
      workspaceId: 'workspace-id',
    });

    expect(workspacesService.getAllWorkspaceTeamSharedFolderFiles).toHaveBeenCalledWith(
      'workspace-id',
      'shared-folder-uuid',
      0,
      50,
      'resources-token',
    );
    expect(namesOf(files)).toEqual(['report (1).pdf']);
  });
});
