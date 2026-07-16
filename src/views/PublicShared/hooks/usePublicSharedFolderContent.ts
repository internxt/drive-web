import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { getItemPlainName } from 'app/crypto/services/utils';
import shareService from 'app/share/services/share.service';
import { AdvancedSharedItem, SharedNetworkCredentials } from 'app/share/types';
import { useEffect, useState } from 'react';
import errorService from 'services/error.service';

const ITEMS_PER_PAGE = 30;

export interface PublicFolderLevel {
  uuid: string;
  name: string;
  token: string;
}

const parsePublicSharedItems = (
  responseItems: SharedFiles[] | SharedFolders[],
  isFolder: boolean,
  credentials?: SharedNetworkCredentials,
): AdvancedSharedItem[] => {
  return responseItems.map((responseItem) => {
    const shareItem = responseItem as AdvancedSharedItem;
    shareItem.isFolder = isFolder;
    shareItem.isRootLink = false;
    shareItem.name = getItemPlainName(shareItem);
    if (credentials) {
      shareItem.credentials = {
        networkUser: credentials.networkUser,
        networkPass: credentials.networkPass,
      };
    }
    return shareItem;
  });
};

const usePublicSharedFolderContent = ({
  rootFolderUuid,
  rootFolderName,
  code,
}: {
  rootFolderUuid: string;
  rootFolderName: string;
  code: string;
}) => {
  const [folderPath, setFolderPath] = useState<PublicFolderLevel[]>([
    { uuid: rootFolderUuid, name: rootFolderName, token: '' },
  ]);
  const [folders, setFolders] = useState<AdvancedSharedItem[]>([]);
  const [files, setFiles] = useState<AdvancedSharedItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMoreFolders, setHasMoreFolders] = useState(true);
  const [hasMoreFiles, setHasMoreFiles] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [nextLevelToken, setNextLevelToken] = useState('');

  const currentFolder = folderPath[folderPath.length - 1];
  const shareItems = [...folders, ...files];
  const hasMoreItems = hasMoreFolders || hasMoreFiles;
  const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && files.length === 0;

  useEffect(() => {
    fetchItems();
  }, [page, currentFolder.uuid, hasMoreFolders]);

  const fetchItems = async () => {
    if (!isLoading) {
      setIsLoading(true);
      try {
        if (hasMoreFolders) {
          await fetchFolders();
        } else if (hasMoreFiles) {
          await fetchFiles();
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fetchFolders = async () => {
    const response = await shareService.getPublicSharedFolderContent(
      currentFolder.uuid,
      'folders',
      currentFolder.token,
      page,
      ITEMS_PER_PAGE,
    );

    setNextLevelToken(response.token);

    const parsedFolders = parsePublicSharedItems(response.items, true, response.credentials);
    setFolders((previousFolders) => (page === 0 ? parsedFolders : [...previousFolders, ...parsedFolders]));

    if (parsedFolders.length < ITEMS_PER_PAGE) {
      // after finish to fetch all folders reset page counter to 0 for fetch files
      setPage(0);
      setHasMoreFolders(false);
    }
  };

  const fetchFiles = async () => {
    const response = await shareService.getPublicSharedFolderContent(
      currentFolder.uuid,
      'files',
      currentFolder.token,
      page,
      ITEMS_PER_PAGE,
      code,
    );

    setNextLevelToken(response.token);

    const parsedFiles = parsePublicSharedItems(response.items, false, response.credentials);
    setFiles((previousFiles) => (page === 0 ? parsedFiles : [...previousFiles, ...parsedFiles]));

    if (parsedFiles.length < ITEMS_PER_PAGE) {
      setHasMoreFiles(false);
    }
  };

  const resetLevelItems = () => {
    setFolders([]);
    setFiles([]);
    setPage(0);
    setHasMoreFolders(true);
    setHasMoreFiles(true);
  };

  const navigateToFolder = (shareItem: AdvancedSharedItem) => {
    if (isLoading || !shareItem.isFolder) return;

    setFolderPath((previousPath) => [
      ...previousPath,
      { uuid: shareItem.uuid, name: shareItem.name, token: nextLevelToken },
    ]);
    resetLevelItems();
  };

  const navigateToFolderAtIndex = (index: number) => {
    if (isLoading || index >= folderPath.length - 1) return;

    setFolderPath((previousPath) => previousPath.slice(0, index + 1));
    resetLevelItems();
  };

  const onNextPage = () => {
    if (!hasMoreItems || isLoading || isAwaitingInitialFilesLoad) {
      return;
    }
    setPage((previousPage) => previousPage + 1);
  };

  return {
    folderPath,
    shareItems,
    isLoading,
    hasMoreItems,
    onNextPage,
    navigateToFolder,
    navigateToFolderAtIndex,
  };
};

export default usePublicSharedFolderContent;
