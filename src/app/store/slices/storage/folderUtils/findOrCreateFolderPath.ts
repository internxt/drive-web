import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { WORKSPACE_FOLDER_REPLICA_DELAY_MS } from 'app/network/networkConstants';
import { RootState } from 'app/store';
import { wait } from 'utils/timeUtils';
import { checkFolderDuplicated } from './checkFolderDuplicated';
import { createFolder } from './createFolder';

interface FindOrCreateFolderPathProps {
  parentFolderId: string;
  folderPath: string[];
  relatedTaskId?: string;
  currentFolderId: string;
  selectedWorkspace: WorkspaceData | null;
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>;
}

type FolderCreationContext = Omit<FindOrCreateFolderPathProps, 'parentFolderId' | 'folderPath'>;

export interface ResolvedFolder {
  folderId: string;
  isNewFolder: boolean;
}

const pendingFolderLookups = new Map<string, Promise<ResolvedFolder>>();

const findExistingFolderId = async (parentFolderId: string, name: string): Promise<string | undefined> => {
  const { duplicatedFoldersResponse } = await checkFolderDuplicated(
    [{ name, folderId: parentFolderId, childrenFiles: [], childrenFolders: [], isFolder: true }],
    parentFolderId,
  );
  return duplicatedFoldersResponse.find((folder) => folder.plainName === name)?.uuid;
};

const createChildFolder = async (
  parentFolderId: string,
  name: string,
  { relatedTaskId, currentFolderId, selectedWorkspace, dispatch }: FolderCreationContext,
): Promise<ResolvedFolder> => {
  const createdFolder = await createFolder(
    { parentFolderId, folderName: name, options: { relatedTaskId, showErrors: false } },
    currentFolderId,
    selectedWorkspace,
    { dispatch },
  );
  return { folderId: createdFolder.uuid, isNewFolder: true };
};

const findOrCreateFolder = async (
  parent: ResolvedFolder,
  name: string,
  context: FolderCreationContext,
): Promise<ResolvedFolder> => {
  const canFolderExist = !parent.isNewFolder;
  const existingFolderId = canFolderExist ? await findExistingFolderId(parent.folderId, name) : undefined;
  if (existingFolderId) return { folderId: existingFolderId, isNewFolder: false };

  return createChildFolder(parent.folderId, name, context);
};

const startFolderLookup = (key: string, parent: ResolvedFolder, name: string, context: FolderCreationContext) => {
  const lookup = findOrCreateFolder(parent, name, context).finally(() => pendingFolderLookups.delete(key));
  pendingFolderLookups.set(key, lookup);
  return lookup;
};

const findOrCreateFolderOnce = (parent: ResolvedFolder, name: string, context: FolderCreationContext) => {
  const key = `${parent.folderId}/${name}`;
  return pendingFolderLookups.get(key) ?? startFolderLookup(key, parent, name, context);
};

/**
 * Finds or creates, one level at a time, every folder of `folderPath` under `parentFolderId`, reusing a
 * folder that already exists with the same name. Once a level has to be created, the deeper levels are
 * created without looking them up: a new folder is empty, and the backend may not see it yet.
 * Concurrent calls that need the same folder share one lookup/creation, so they all learn whether it is new.
 * In a workspace it waits WORKSPACE_FOLDER_REPLICA_DELAY_MS before resolving, so the caller can upload into
 * the folder right away.
 * @returns the uuid of the last folder of the path and whether this lookup created it
 * @throws the error of the first folder that could not be found or created
 */
export const findOrCreateFolderPath = async ({
  parentFolderId,
  folderPath,
  ...context
}: FindOrCreateFolderPathProps): Promise<ResolvedFolder> => {
  let folder: ResolvedFolder = { folderId: parentFolderId, isNewFolder: false };
  for (const name of folderPath) {
    folder = await findOrCreateFolderOnce(folder, name, context);
  }

  const shouldWaitForReplica = !!context.selectedWorkspace && folderPath.length > 0;
  if (shouldWaitForReplica) await wait(WORKSPACE_FOLDER_REPLICA_DELAY_MS);

  return folder;
};
