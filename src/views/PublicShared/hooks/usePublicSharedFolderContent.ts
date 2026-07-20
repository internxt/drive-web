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
  const [credentials, setCredentials] = useState<SharedNetworkCredentials>();

  const currentFolder = folderPath[folderPath.length - 1];
  const shareItems = [...folders, ...files];
  const hasMoreItems = hasMoreFolders || hasMoreFiles;
  const isAwaitingInitialFilesLoad = !hasMoreFolders && hasMoreFiles && files.length === 0;

  useEffect(() => {
    fetchItems();
  }, [page, currentFolder.uuid, hasMoreFolders]);

  const fetchItems = async () => {
    if (isLoading || (!hasMoreFolders && !hasMoreFiles)) return;

    setIsLoading(true);
    try {
      await fetchLevelItems(hasMoreFolders ? 'folders' : 'files');
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLevelItems = async (type: 'folders' | 'files') => {
    const isFoldersPhase = type === 'folders';

    const response = await shareService.getPublicSharedFolderContent(
      currentFolder.uuid,
      type,
      currentFolder.token,
      page,
      ITEMS_PER_PAGE,
      isFoldersPhase ? undefined : code,
    );

    setNextLevelToken(response.token);
    if (response.credentials) {
      setCredentials(response.credentials);
    }

    const parsedItems = parsePublicSharedItems(response.items, isFoldersPhase, response.credentials);
    const setItems = isFoldersPhase ? setFolders : setFiles;
    setItems((previousItems) => (page === 0 ? parsedItems : [...previousItems, ...parsedItems]));

    if (parsedItems.length < ITEMS_PER_PAGE) {
      if (isFoldersPhase) {
        setPage(0);
        setHasMoreFolders(false);
      } else {
        setHasMoreFiles(false);
      }
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
    credentials,
    nextLevelToken,
    isLoading,
    hasMoreItems,
    onNextPage,
    navigateToFolder,
    navigateToFolderAtIndex,
  };
};

export default usePublicSharedFolderContent;
