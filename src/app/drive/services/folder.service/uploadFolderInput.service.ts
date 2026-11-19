import { IRoot } from 'app/store/slices/storage/types';

export const transformInputFilesToItems = (
  inputFiles: File[],
  currentFolderId: string,
): { rootList: IRoot[]; files: File[] } => {
  const rootList: IRoot[] = [];
  const files: File[] = [];
  const foldersByPath = new Map<string, IRoot>();

  const getOrCreateFolder = (pathSegments: string[]): IRoot => {
    const path = pathSegments.join('/');
    const existingFolder = foldersByPath.get(path);
    if (existingFolder) return existingFolder;

    const isRootFolder = pathSegments.length === 1;
    const folder: IRoot = {
      name: pathSegments.at(-1) as string,
      isFolder: true,
      folderId: isRootFolder ? currentFolderId : null,
      childrenFiles: [],
      childrenFolders: [],
    };

    if (isRootFolder) {
      rootList.push(folder);
    } else {
      getOrCreateFolder(pathSegments.slice(0, -1)).childrenFolders.push(folder);
    }
    foldersByPath.set(path, folder);

    return folder;
  };

  for (const file of inputFiles) {
    const folderPathSegments = file.webkitRelativePath.split('/').slice(0, -1);

    if (folderPathSegments.length === 0) {
      files.push(file);
    } else {
      getOrCreateFolder(folderPathSegments).childrenFiles.push(file);
    }
  }

  return { rootList, files };
};
