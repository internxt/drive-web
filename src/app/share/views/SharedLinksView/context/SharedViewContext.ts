import { createContext, Dispatch } from 'react';
import { OrderDirection } from '../../../../core/types';
import { DriveItemData } from '../../../../drive/types';
import { AdvancedSharedItem, PreviewFileItem } from '../../../types';
import { OrderField } from '../components/SharedItemList';

export interface ShareViewState {
  hasMoreFiles: boolean;
  hasMoreFolders: boolean;
  page: number;
  isLoading: boolean;
  shareFolders: AdvancedSharedItem[];
  shareFiles: AdvancedSharedItem[];
  orderBy?: { field: OrderField; direction: OrderDirection };
  selectedItems: AdvancedSharedItem[];
  itemToView?: PreviewFileItem;
  editNameItem?: DriveItemData;
  showStopSharingConfirmation: boolean;
  isFileViewerOpen: boolean;
  isEditNameDialogOpen: boolean;
  isDeleteDialogModalOpen: boolean;
  currentFolderLevelResourcesToken: string;
  nextFolderLevelResourcesToken: string;
  clickedShareItemUser?: AdvancedSharedItem['user'];
  clickedShareItemEncryptionKey: string;
  currentFolderId: string;
  currentParentFolderId?: string;
  currentShareOwnerAvatar: string;
  filesOwnerCredentials?: {
    networkPass: string;
    networkUser: string;
  };
  ownerBucket: null | string;
  ownerEncryptionKey: null | string;
}

export type Action =
  | { type: 'SET_HAS_MORE_FILES'; payload: boolean }
  | { type: 'SET_HAS_MORE_FOLDERS'; payload: boolean }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_SHARE_FOLDERS'; payload: AdvancedSharedItem[] }
  | { type: 'SET_SHARE_FILES'; payload: AdvancedSharedItem[] }
  | { type: 'SET_ORDER_BY'; payload?: { field: OrderField; direction: OrderDirection } }
  | { type: 'SET_SELECTED_ITEMS'; payload: AdvancedSharedItem[] }
  | { type: 'SET_ITEM_TO_VIEW'; payload?: PreviewFileItem }
  | { type: 'SET_EDIT_NAME_ITEM'; payload?: DriveItemData }
  | { type: 'SET_STOP_SHARING_CONFIRMATION'; payload: boolean }
  | { type: 'SET_IS_FILE_VIEWER_OPEN'; payload: boolean }
  | { type: 'SET_IS_EDIT_NAME_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_IS_DELETE_DIALOG_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_CURRENT_FOLDER_LEVEL_RESOURCES_TOKEN'; payload: string }
  | { type: 'SET_NEXT_FOLDER_LEVEL_RESOURCES_TOKEN'; payload: string }
  | { type: 'SET_CLICKED_SHARE_ITEM_USER'; payload?: AdvancedSharedItem['user'] }
  | { type: 'SET_CLICKED_SHARE_ITEM_ENCRYPTION_KEY'; payload: string }
  | { type: 'SET_CURRENT_FOLDER_ID'; payload: string }
  | { type: 'SET_CURRENT_PARENT_FOLDER_ID'; payload?: string }
  | { type: 'SET_CURRENT_SHARE_OWNER_AVATAR'; payload: string }
  | { type: 'SET_FILES_OWNER_CREDENTIALS'; payload: { networkPass: string; networkUser: string } }
  | { type: 'SET_OWNER_BUCKET'; payload: null | string }
  | { type: 'SET_OWNER_ENCRYPTION_KEY'; payload: null | string };

export const ActionTypes = {
  SET_HAS_MORE_FILES: 'SET_HAS_MORE_FILES',
  SET_HAS_MORE_FOLDERS: 'SET_HAS_MORE_FOLDERS',
  SET_PAGE: 'SET_PAGE',
  SET_IS_LOADING: 'SET_IS_LOADING',
  SET_SHARE_FOLDERS: 'SET_SHARE_FOLDERS',
  SET_SHARE_FILES: 'SET_SHARE_FILES',
  SET_ORDER_BY: 'SET_ORDER_BY',
  SET_SELECTED_ITEMS: 'SET_SELECTED_ITEMS',
  SET_ITEM_TO_VIEW: 'SET_ITEM_TO_VIEW',
  SET_EDIT_NAME_ITEM: 'SET_EDIT_NAME_ITEM',
  SET_STOP_SHARING_CONFIRMATION: 'SET_STOP_SHARING_CONFIRMATION',
  SET_IS_FILE_VIEWER_OPEN: 'SET_IS_FILE_VIEWER_OPEN',
  SET_IS_EDIT_NAME_DIALOG_OPEN: 'SET_IS_EDIT_NAME_DIALOG_OPEN',
  SET_IS_DELETE_DIALOG_MODAL_OPEN: 'SET_IS_DELETE_DIALOG_MODAL_OPEN',
  SET_CURRENT_FOLDER_LEVEL_RESOURCES_TOKEN: 'SET_CURRENT_FOLDER_LEVEL_RESOURCES_TOKEN',
  SET_NEXT_FOLDER_LEVEL_RESOURCES_TOKEN: 'SET_NEXT_FOLDER_LEVEL_RESOURCES_TOKEN',
  SET_CLICKED_SHARE_ITEM_USER: 'SET_CLICKED_SHARE_ITEM_USER',
  SET_CLICKED_SHARE_ITEM_ENCRYPTION_KEY: 'SET_CLICKED_SHARE_ITEM_ENCRYPTION_KEY',
  SET_CURRENT_FOLDER_ID: 'SET_CURRENT_FOLDER_ID',
  SET_CURRENT_PARENT_FOLDER_ID: 'SET_CURRENT_PARENT_FOLDER_ID',
  SET_CURRENT_SHARE_OWNER_AVATAR: 'SET_CURRENT_SHARE_OWNER_AVATAR',
  SET_FILES_OWNER_CREDENTIALS: 'SET_FILES_OWNER_CREDENTIALS',
  SET_OWNER_BUCKET: 'SET_OWNER_BUCKET',
  SET_OWNER_ENCRYPTION_KEY: 'SET_OWNER_ENCRYPTION_KEY',
} as const;

export interface ShareViewContextProps {
  state: ShareViewState;
  actionDispatch: Dispatch<Action>;
}

export const ShareViewContext = createContext<ShareViewContextProps | undefined>(undefined);
