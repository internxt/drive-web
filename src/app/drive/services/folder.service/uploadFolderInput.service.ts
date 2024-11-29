import { IRoot } from '../../../store/slices/storage/types';

export const transformInputFilesToJSON = (files: File[]): JSON => {
  const result = {} as JSON;
  for (const file of files) {
    file.webkitRelativePath.split('/').reduce((previousValue, currentValue, currentIndex, arrayPaths) => {
      if (currentIndex === arrayPaths.length - 1) {
        previousValue[currentValue] = file;
      }
      return (previousValue[currentValue] = previousValue[currentValue] || {});
    }, result);
  }
  return result;
};

export const transformJsonFilesToItems = (
  jsonObject: JSON,
  currentFolderId: string,
): { rootList: Array<IRoot>; rootFiles: Array<File> } => {
  const rootList = [] as IRoot[];
  const rootFiles = [] as File[];

  for (const [key, value] of Object.entries(jsonObject)) {
    if (value instanceof File) {
      rootFiles.push(value);
    } else {
      rootList.push({
        name: key,
        folderId: currentFolderId,
        fullPathEdited: '/' + key,
        childrenFiles: getChildrenFiles(value),
        childrenFolders: getChildrenFolders(value),
      });
    }
  }
  return { rootList, rootFiles };
};

const getChildrenFiles = (jsonObject: JSON): File[] => {
  const childrenFiles = [] as File[];
  for (const [key, value] of Object.entries(jsonObject)) {
    if (value instanceof File) {
      childrenFiles.push(value);
    }
  }
  return childrenFiles;
};

const getChildrenFolders = (jsonObject: JSON): IRoot[] => {
  const childrenFolders = [] as IRoot[];
  for (const [key, value] of Object.entries(jsonObject)) {
    if (!(value instanceof File)) {
      childrenFolders.push({
        name: key,
        folderId: null,
        fullPathEdited: '/' + key,
        childrenFiles: getChildrenFiles(value),
        childrenFolders: getChildrenFolders(value),
      });
    }
  }
  return childrenFolders;
};
