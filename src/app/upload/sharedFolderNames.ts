import { items as itemUtils } from '@internxt/lib';
import { renameFile } from 'app/crypto/services/utils';
import shareService from 'app/share/services/share.service';
import workspacesService from 'services/workspace.service';

const SHARED_FILES_PAGE_SIZE = 50;

interface ExistingName {
  name: string;
  type?: string;
}

export interface SharedFolder {
  uuid: string;
  resourcesToken: string;
  workspaceId?: string;
}

const listSharedFilesPage = async ({ uuid, resourcesToken, workspaceId }: SharedFolder, page: number) => {
  if (workspaceId) {
    const [filesPromise] = workspacesService.getAllWorkspaceTeamSharedFolderFiles(
      workspaceId,
      uuid,
      page,
      SHARED_FILES_PAGE_SIZE,
      resourcesToken,
    );
    const workspaceSharedFiles = await filesPromise;
    return workspaceSharedFiles.items;
  }

  const sharedFiles = await shareService.getSharedFolderContent(
    uuid,
    'files',
    resourcesToken,
    page,
    SHARED_FILES_PAGE_SIZE,
  );
  return sharedFiles.items;
};

const listNamesInSharedFolder = async (sharedFolder: SharedFolder): Promise<ExistingName[]> => {
  const names: ExistingName[] = [];

  for (let page = 0; ; page++) {
    const sharedFiles = await listSharedFilesPage(sharedFolder, page);
    names.push(...sharedFiles.map((sharedFile) => ({ name: sharedFile.plainName, type: sharedFile.type })));

    const isLastPage = sharedFiles.length < SHARED_FILES_PAGE_SIZE;
    if (isLastPage) return names;
  }
};

/**
 * In a shared folder the name collision dialog cannot be used, so files whose name is already taken get the next
 * free one instead, such as "report (1).pdf".
 */
export const renameToFreeNamesInSharedFolder = async (files: File[], sharedFolder: SharedFolder): Promise<File[]> => {
  const takenNames = await listNamesInSharedFolder(sharedFolder);

  return files.map((file) => {
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    const [, , freeFilename] = itemUtils.renameIfNeeded(takenNames, filename, extension);
    takenNames.push({ name: freeFilename, type: extension });

    return renameFile(file, extension ? `${freeFilename}.${extension}` : freeFilename);
  });
};
