import { useEffect } from 'react';
import {
  setCurrentFolderLevelResourcesToken,
  setCurrentShareOwnerAvatar,
  setFilesOwnerCredentials,
  setHasMoreFolders,
  setHasMoreFiles,
  setIsLoading,
  setNextFolderLevelResourcesToken,
  setOwnerBucket,
  setOwnerEncryptionKey,
  setPage,
  setSharedFolders,
  setSharedFiles,
} from '../context/SharedViewContext.actions';
import errorService from '../../../../core/services/error.service';

import { useShareViewContext } from '../context/SharedViewContextProvider';
import shareService from '../../../services/share.service';
import {
  ListAllSharedFoldersResponse,
  ListSharedItemsResponse,
  SharedFiles,
  SharedFolders,
} from '@internxt/sdk/dist/drive/share/types';
import { AdvancedSharedItem, SharedNetworkCredentials } from '../../../types';
import { getItemPlainName } from '../../../../crypto/services/utils';
import { sharedActions } from '../../../../store/slices/sharedLinks';
import { useDispatch } from 'react-redux';
import { removeDuplicates } from '../../../../utils/driveItemsUtils';

const ITEMS_PER_PAGE = 30;

const parseSharedFolderResponseItems = ({
  sharedFolderResponseItems,
  credentials,
  isFolder,
  isFromRootFolder,
}: {
  sharedFolderResponseItems: SharedFiles[] | SharedFolders[];
  credentials?: SharedNetworkCredentials;
  isFolder: boolean;
  isFromRootFolder: boolean;
}) => {
  return sharedFolderResponseItems.map((file) => {
    const shareItem = file as AdvancedSharedItem;
    shareItem.isFolder = isFolder;
    shareItem.isRootLink = isFromRootFolder;
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

const addItemsToList = (
  list: AdvancedSharedItem[],
  newItemsList: AdvancedSharedItem[],
  pageNumber: number,
): AdvancedSharedItem[] => {
  if (pageNumber === 0) {
    return [...newItemsList];
  }

  return [...list, ...newItemsList];
};

const useFetchSharedData = () => {
  const { state, actionDispatch } = useShareViewContext();
  const dispatch = useDispatch();

  const {
    page,
    isLoading,
    hasMoreFiles,
    hasMoreFolders,
    orderBy,
    currentFolderId,
    currentFolderLevelResourcesToken,
    shareFolders,
    shareFiles,
  } = state;

  useEffect(() => {
    fetchData();
  }, [page, currentFolderId, hasMoreFolders]);

  const fetchData = async () => {
    actionDispatch(setIsLoading(true));

    if (!isLoading) {
      const isRootFolder = !currentFolderId;
      try {
        if (isRootFolder && hasMoreFolders) {
          await fetchRootFolders();
        } else if (isRootFolder && !hasMoreFolders && hasMoreFiles) {
          await fetchRootFiles();
        } else if (!isRootFolder && hasMoreFolders) {
          await fetchFolders();
        } else if (!isRootFolder && !hasMoreFolders && hasMoreFiles) {
          await fetchFiles();
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        actionDispatch(setIsLoading(false));
      }
    }
  };

  const fetchRootFolders = async () => {
    dispatch(sharedActions.setCurrentShareId(null));
    dispatch(sharedActions.setCurrentSharingRole(null));
    actionDispatch(setIsLoading(true));
    actionDispatch(setCurrentFolderLevelResourcesToken(''));
    actionDispatch(setNextFolderLevelResourcesToken(''));
    actionDispatch(setCurrentShareOwnerAvatar(''));

    try {
      const response: ListAllSharedFoldersResponse = await shareService.getAllSharedFolders(page, ITEMS_PER_PAGE);

      const folders = parseSharedFolderResponseItems({
        sharedFolderResponseItems: response.folders,
        isFolder: true,
        isFromRootFolder: true,
      });

      const items = addItemsToList(shareFolders, folders, page);
      actionDispatch(setSharedFolders(items));

      if (folders.length < ITEMS_PER_PAGE) {
        // after finish to fetch all folders reset page counter to 0 for fetch files
        actionDispatch(setPage(0));
        actionDispatch(setHasMoreFolders(false));
      }
    } catch (error) {
      errorService.reportError(error);
    } finally {
      actionDispatch(setIsLoading(false));
    }
  };

  const fetchRootFiles = async () => {
    actionDispatch(setIsLoading(true));

    try {
      const response: ListAllSharedFoldersResponse = await shareService.getAllSharedFiles(page, ITEMS_PER_PAGE);

      const files = parseSharedFolderResponseItems({
        sharedFolderResponseItems: response.files,
        isFolder: false,
        isFromRootFolder: true,
      });

      const items = addItemsToList(shareFiles, files, page);

      actionDispatch(setSharedFiles(items));

      if (files.length < ITEMS_PER_PAGE) {
        actionDispatch(setHasMoreFiles(false));
      }
    } catch (error) {
      errorService.reportError(error);
    } finally {
      actionDispatch(setIsLoading(false));
    }
  };

  const fetchFolders = async () => {
    if (currentFolderId && hasMoreFolders) {
      actionDispatch(setIsLoading(true));
      try {
        const response: ListSharedItemsResponse & { role: string } = (await shareService.getSharedFolderContent(
          currentFolderId,
          'folders',
          currentFolderLevelResourcesToken,
          page,
          ITEMS_PER_PAGE,
        )) as ListSharedItemsResponse & { role: string };

        const token = response.token;
        actionDispatch(setNextFolderLevelResourcesToken(token));

        if (response.role) dispatch(sharedActions.setCurrentSharingRole(response.role.toLowerCase()));

        const folders = parseSharedFolderResponseItems({
          sharedFolderResponseItems: response.items,
          credentials: response.credentials,
          isFolder: true,
          isFromRootFolder: false,
        });
        const items = addItemsToList(shareFolders, folders, page);

        actionDispatch(setSharedFolders(items));

        if (folders.length < ITEMS_PER_PAGE) {
          // after finish to fetch all folders reset page counter to 0 for fetch files
          actionDispatch(setPage(0));
          actionDispatch(setHasMoreFolders(false));
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        actionDispatch(setIsLoading(false));
      }
    }
  };

  const fetchFiles = async (forceFetch?: boolean) => {
    if (currentFolderId && !hasMoreFolders && (hasMoreFiles || forceFetch)) {
      actionDispatch(setIsLoading(true));
      try {
        const response: ListSharedItemsResponse & { bucket: string; encryptionKey: string } =
          (await shareService.getSharedFolderContent(
            currentFolderId,
            'files',
            currentFolderLevelResourcesToken,
            page,
            ITEMS_PER_PAGE,
          )) as ListSharedItemsResponse & { bucket: string; encryptionKey: string };

        const token = response.token;
        actionDispatch(setNextFolderLevelResourcesToken(token));

        const networkPass = response.credentials.networkPass;
        const networkUser = response.credentials.networkUser;
        actionDispatch(setFilesOwnerCredentials({ networkPass, networkUser }));
        const bucket = response.bucket;
        actionDispatch(setOwnerBucket(bucket));
        const ownerMnemonincEncrypted = response.encryptionKey;
        actionDispatch(setOwnerEncryptionKey(ownerMnemonincEncrypted));

        const files = parseSharedFolderResponseItems({
          sharedFolderResponseItems: response.items,
          credentials: response.credentials,
          isFolder: false,
          isFromRootFolder: false,
        });
        const items = addItemsToList(shareFiles, files, page);

        const itemsWithoutDuplicates = removeDuplicates(items);
        actionDispatch(setSharedFiles(itemsWithoutDuplicates));

        if (files.length < ITEMS_PER_PAGE) {
          actionDispatch(setHasMoreFiles(false));
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        actionDispatch(setIsLoading(false));
      }
    }
  };

  return { fetchData, fetchRootFolders, fetchRootFiles, fetchFiles, fetchFolders };
};

export default useFetchSharedData;
