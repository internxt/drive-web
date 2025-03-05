import { useEffect } from 'react';
import errorService from '../../../../core/services/error.service';
import {
  setCurrentFolderLevelResourcesToken,
  setCurrentShareOwnerAvatar,
  setFilesOwnerCredentials,
  setHasMoreFiles,
  setHasMoreFolders,
  setIsLoading,
  setNextFolderLevelResourcesToken,
  setOwnerBucket,
  setOwnerEncryptionKey,
  setPage,
  setSharedFiles,
  setSharedFolders,
} from '../context/SharedViewContext.actions';

import { ListSharedItemsResponse, SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { useDispatch, useSelector } from 'react-redux';
import workspacesService from '../../../../core/services/workspace.service';
import { getItemPlainName } from '../../../../crypto/services/utils';
import { sharedActions } from '../../../../store/slices/sharedLinks';
import workspacesSelectors from '../../../../store/slices/workspaces/workspaces.selectors';
import { removeDuplicates } from '../../../../utils/driveItemsUtils';
import shareService from '../../../services/share.service';
import { AdvancedSharedItem, SharedNetworkCredentials } from '../../../types';
import { useShareViewContext } from '../context/SharedViewContextProvider';
import localStorageService, { STORAGE_KEYS } from '../../../../core/services/local-storage.service';

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
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceCredentials = useSelector(workspacesSelectors.getWorkspaceCredentials);
  const workspaceId = selectedWorkspace?.workspace.id;
  const defaultTeamId = selectedWorkspace?.workspace.defaultTeamId;

  const {
    page,
    isLoading,
    hasMoreFiles,
    hasMoreFolders,
    currentFolderId,
    currentFolderLevelResourcesToken,
    shareFolders,
    shareFiles,
  } = state;

  useEffect(() => {
    fetchData();
  }, [page, currentFolderId, hasMoreFolders]);

  const fetchData = async () => {
    if (!isLoading) {
      actionDispatch(setIsLoading(true));

      const isRootFolder = !currentFolderId;
      try {
        if (isRootFolder && hasMoreFolders) {
          await fetchRootFolders(workspaceId);
        } else if (isRootFolder && !hasMoreFolders && hasMoreFiles) {
          await fetchRootFiles(workspaceId);
        } else if (!isRootFolder && hasMoreFolders) {
          await fetchFolders(workspaceId);
        } else if (!isRootFolder && !hasMoreFolders && hasMoreFiles) {
          await fetchFiles(false, workspaceId);
        }
      } catch (error) {
        errorService.reportError(error);
      } finally {
        actionDispatch(setIsLoading(false));
      }
    }
  };

  const fetchRootFolders = async (workspaceId?: string) => {
    localStorageService.set(STORAGE_KEYS.FOLDER_ACCESS_TOKEN, '');
    dispatch(sharedActions.setCurrentShareId(null));
    dispatch(sharedActions.setCurrentSharingRole(null));
    actionDispatch(setIsLoading(true));
    actionDispatch(setCurrentFolderLevelResourcesToken(''));
    actionDispatch(setNextFolderLevelResourcesToken(''));
    actionDispatch(setCurrentShareOwnerAvatar(''));

    try {
      let response;

      if (workspaceId) {
        const [promise] = workspacesService.getAllWorkspaceTeamSharedFolders(workspaceId);
        response = await promise;
      } else {
        response = await shareService.getAllSharedFolders(page, ITEMS_PER_PAGE);
      }

      const folders = parseSharedFolderResponseItems({
        sharedFolderResponseItems: response.folders,
        isFolder: true,
        isFromRootFolder: true,
        credentials: workspaceCredentials?.credentials,
      });

      const items = addItemsToList(shareFolders, folders, page);
      actionDispatch(setSharedFolders(items));

      if (folders.length < ITEMS_PER_PAGE) {
        // after finish to fetch all folders reset page counter to 0 for fetch files
        actionDispatch(setPage(0));
        actionDispatch(setHasMoreFolders(false));
      }
      localStorageService.set(STORAGE_KEYS.FOLDER_ACCESS_TOKEN, response.token);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      actionDispatch(setIsLoading(false));
    }
  };

  const fetchRootFiles = async (workspaceId?: string) => {
    localStorageService.set(STORAGE_KEYS.FILE_ACCESS_TOKEN, '');
    actionDispatch(setIsLoading(true));

    try {
      let response;

      if (workspaceId) {
        const [promise] = workspacesService.getAllWorkspaceTeamSharedFiles(workspaceId);
        response = await promise;
      } else {
        response = await shareService.getAllSharedFiles(page, ITEMS_PER_PAGE);
      }

      const files = parseSharedFolderResponseItems({
        sharedFolderResponseItems: response.files,
        isFolder: false,
        isFromRootFolder: true,
        credentials: workspaceCredentials?.credentials,
      });

      const items = addItemsToList(shareFiles, files, page);

      actionDispatch(setSharedFiles(items));

      if (files.length < ITEMS_PER_PAGE) {
        actionDispatch(setHasMoreFiles(false));
      }
      localStorageService.set(STORAGE_KEYS.FILE_ACCESS_TOKEN, response.token);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      actionDispatch(setIsLoading(false));
    }
  };

  const fetchFolders = async (workspaceId?: string) => {
    if (currentFolderId && hasMoreFolders) {
      actionDispatch(setIsLoading(true));

      try {
        let response;
        if (workspaceId) {
          const [promise] = workspacesService.getAllWorkspaceTeamSharedFolderFolders(
            workspaceId,
            currentFolderId,
            page,
            ITEMS_PER_PAGE,
            currentFolderLevelResourcesToken,
          );
          response = await promise;
        } else {
          response = (await shareService.getSharedFolderContent(
            currentFolderId,
            'folders',
            currentFolderLevelResourcesToken,
            page,
            ITEMS_PER_PAGE,
          )) as ListSharedItemsResponse & { role: string };
        }

        const token = response.token;
        actionDispatch(setNextFolderLevelResourcesToken(token));
        localStorageService.set(STORAGE_KEYS.FOLDER_ACCESS_TOKEN, token);

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

  const fetchFiles = async (forceFetch: boolean, workspaceId?: string) => {
    if (currentFolderId && !hasMoreFolders && (hasMoreFiles || forceFetch)) {
      actionDispatch(setIsLoading(true));
      try {
        let response;
        if (workspaceId) {
          const [promise] = workspacesService.getAllWorkspaceTeamSharedFolderFiles(
            workspaceId,
            currentFolderId,
            page,
            ITEMS_PER_PAGE,
            currentFolderLevelResourcesToken,
          );
          response = await promise;
        } else {
          response = (await shareService.getSharedFolderContent(
            currentFolderId,
            'files',
            currentFolderLevelResourcesToken,
            page,
            ITEMS_PER_PAGE,
          )) as ListSharedItemsResponse & { bucket: string; encryptionKey: string };
        }

        const token = response.token;
        actionDispatch(setNextFolderLevelResourcesToken(token));
        localStorageService.set(STORAGE_KEYS.FILE_ACCESS_TOKEN, token);

        const networkPass = response.credentials?.networkPass ?? workspaceCredentials?.credentials.networkPass;
        const networkUser = response.credentials?.networkUser ?? workspaceCredentials?.credentials.networkUser;
        const credentials = { networkUser, networkPass };
        actionDispatch(setFilesOwnerCredentials({ networkPass, networkUser }));
        const bucket = response.bucket;
        actionDispatch(setOwnerBucket(bucket));
        const ownerMnemonincEncrypted = response.encryptionKey;
        actionDispatch(setOwnerEncryptionKey(ownerMnemonincEncrypted));

        const files = parseSharedFolderResponseItems({
          sharedFolderResponseItems: response.items,
          credentials: credentials,
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
