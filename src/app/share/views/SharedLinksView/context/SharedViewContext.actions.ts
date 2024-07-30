import { OrderDirection } from '../../../../core/types';
import { DriveItemData } from '../../../../drive/types';
import { AdvancedSharedItem, PreviewFileItem } from '../../../types';
import { OrderField } from '../components/SharedItemList';
import { Action, ActionTypes } from './SharedViewContext';

const setHasMoreFiles = (payload: boolean): Action => ({
  type: ActionTypes.SET_HAS_MORE_FILES,
  payload,
});

const setHasMoreFolders = (payload: boolean): Action => ({
  type: ActionTypes.SET_HAS_MORE_FOLDERS,
  payload,
});

const setPage = (payload: number): Action => ({
  type: ActionTypes.SET_PAGE,
  payload,
});

const setIsLoading = (payload: boolean): Action => ({
  type: ActionTypes.SET_IS_LOADING,
  payload,
});

const setSharedFolders = (payload: AdvancedSharedItem[]): Action => ({
  type: ActionTypes.SET_SHARE_FOLDERS,
  payload,
});

const setSharedFiles = (payload: AdvancedSharedItem[]): Action => ({
  type: ActionTypes.SET_SHARE_FILES,
  payload,
});

const setOrderBy = (payload?: { field: OrderField; direction: OrderDirection }): Action => ({
  type: ActionTypes.SET_ORDER_BY,
  payload,
});

const setSelectedItems = (payload: AdvancedSharedItem[]): Action => ({
  type: ActionTypes.SET_SELECTED_ITEMS,
  payload,
});

const setItemToView = (payload?: PreviewFileItem): Action => ({
  type: ActionTypes.SET_ITEM_TO_VIEW,
  payload,
});

const setEditNameItem = (payload?: DriveItemData): Action => ({
  type: ActionTypes.SET_EDIT_NAME_ITEM,
  payload,
});

const setShowStopSharingConfirmation = (payload: boolean): Action => ({
  type: ActionTypes.SET_STOP_SHARING_CONFIRMATION,
  payload,
});

const setIsFileViewerOpen = (payload: boolean): Action => ({
  type: ActionTypes.SET_IS_FILE_VIEWER_OPEN,
  payload,
});

const setIsEditNameDialogOpen = (payload: boolean): Action => ({
  type: ActionTypes.SET_IS_EDIT_NAME_DIALOG_OPEN,
  payload,
});

const setIsDeleteDialogModalOpen = (payload: boolean): Action => ({
  type: ActionTypes.SET_IS_DELETE_DIALOG_MODAL_OPEN,
  payload,
});

const setCurrentFolderLevelResourcesToken = (payload: string): Action => ({
  type: ActionTypes.SET_CURRENT_FOLDER_LEVEL_RESOURCES_TOKEN,
  payload,
});

const setNextFolderLevelResourcesToken = (payload: string): Action => ({
  type: ActionTypes.SET_NEXT_FOLDER_LEVEL_RESOURCES_TOKEN,
  payload,
});

const setClickedShareItemUser = (payload?: AdvancedSharedItem['user']): Action => ({
  type: ActionTypes.SET_CLICKED_SHARE_ITEM_USER,
  payload,
});

const setClickedShareItemEncryptionKey = (payload: string): Action => ({
  type: ActionTypes.SET_CLICKED_SHARE_ITEM_ENCRYPTION_KEY,
  payload,
});

const setCurrentFolderId = (payload: string): Action => ({
  type: ActionTypes.SET_CURRENT_FOLDER_ID,
  payload,
});

const setCurrentParentFolderId = (payload?: string): Action => ({
  type: ActionTypes.SET_CURRENT_PARENT_FOLDER_ID,
  payload,
});

const setCurrentShareOwnerAvatar = (payload: string): Action => ({
  type: ActionTypes.SET_CURRENT_SHARE_OWNER_AVATAR,
  payload,
});

const setFilesOwnerCredentials = (payload: { networkPass: string; networkUser: string }): Action => ({
  type: ActionTypes.SET_FILES_OWNER_CREDENTIALS,
  payload,
});

const setOwnerBucket = (payload: null | string): Action => ({
  type: ActionTypes.SET_OWNER_BUCKET,
  payload,
});

const setOwnerEncryptionKey = (payload: null | string): Action => ({
  type: ActionTypes.SET_OWNER_ENCRYPTION_KEY,
  payload,
});

export {
  setClickedShareItemEncryptionKey,
  setClickedShareItemUser,
  setCurrentFolderId,
  setCurrentFolderLevelResourcesToken,
  setCurrentParentFolderId,
  setCurrentShareOwnerAvatar,
  setEditNameItem,
  setFilesOwnerCredentials,
  setHasMoreFiles,
  setHasMoreFolders,
  setIsDeleteDialogModalOpen,
  setIsEditNameDialogOpen,
  setIsFileViewerOpen,
  setIsLoading,
  setItemToView,
  setNextFolderLevelResourcesToken,
  setOrderBy,
  setOwnerBucket,
  setOwnerEncryptionKey,
  setPage,
  setSelectedItems,
  setSharedFiles,
  setSharedFolders,
  setShowStopSharingConfirmation,
};
