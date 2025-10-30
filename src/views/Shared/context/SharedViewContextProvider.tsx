import React, { useContext, useReducer, ReactNode, useMemo } from 'react';
import { Action, ShareViewState, ShareViewContext, ShareViewContextProps, ActionTypes } from './SharedViewContext';

const initialState: ShareViewState = {
  hasMoreFiles: true,
  hasMoreFolders: true,
  page: 0,
  isLoading: true,
  shareFolders: [],
  shareFiles: [],
  orderBy: undefined,
  selectedItems: [],
  itemToView: undefined,
  editNameItem: undefined,
  showStopSharingConfirmation: false,
  isFileViewerOpen: false,
  isEditNameDialogOpen: false,
  isDeleteDialogModalOpen: false,
  currentFolderLevelResourcesToken: '',
  nextFolderLevelResourcesToken: '',
  clickedShareItemUser: undefined,
  clickedShareItemEncryptionKey: '',
  currentFolderId: '',
  currentParentFolderId: undefined,
  currentShareOwnerAvatar: '',
  filesOwnerCredentials: {
    networkPass: '',
    networkUser: '',
  },
  ownerBucket: null,
  ownerEncryptionKey: null,
};

const reducer = (state: ShareViewState, action: Action): ShareViewState => {
  switch (action.type) {
    case ActionTypes.SET_HAS_MORE_FILES:
      return { ...state, hasMoreFiles: action.payload };
    case ActionTypes.SET_HAS_MORE_FOLDERS:
      return { ...state, hasMoreFolders: action.payload };
    case ActionTypes.SET_PAGE:
      return { ...state, page: action.payload };
    case ActionTypes.SET_IS_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_SHARE_FOLDERS:
      return { ...state, shareFolders: action.payload };
    case ActionTypes.SET_SHARE_FILES:
      return { ...state, shareFiles: action.payload };
    case ActionTypes.SET_ORDER_BY:
      return { ...state, orderBy: action.payload };
    case ActionTypes.SET_SELECTED_ITEMS:
      return { ...state, selectedItems: action.payload };
    case ActionTypes.SET_ITEM_TO_VIEW:
      return { ...state, itemToView: action.payload };
    case ActionTypes.SET_EDIT_NAME_ITEM:
      return { ...state, editNameItem: action.payload };
    case ActionTypes.SET_STOP_SHARING_CONFIRMATION:
      return { ...state, showStopSharingConfirmation: action.payload };
    case ActionTypes.SET_IS_FILE_VIEWER_OPEN:
      return { ...state, isFileViewerOpen: action.payload };
    case ActionTypes.SET_IS_EDIT_NAME_DIALOG_OPEN:
      return { ...state, isEditNameDialogOpen: action.payload };
    case ActionTypes.SET_IS_DELETE_DIALOG_MODAL_OPEN:
      return { ...state, isDeleteDialogModalOpen: action.payload };
    case ActionTypes.SET_CURRENT_FOLDER_LEVEL_RESOURCES_TOKEN:
      return { ...state, currentFolderLevelResourcesToken: action.payload };
    case ActionTypes.SET_NEXT_FOLDER_LEVEL_RESOURCES_TOKEN:
      return { ...state, nextFolderLevelResourcesToken: action.payload };
    case ActionTypes.SET_CLICKED_SHARE_ITEM_USER:
      return { ...state, clickedShareItemUser: action.payload };
    case ActionTypes.SET_CLICKED_SHARE_ITEM_ENCRYPTION_KEY:
      return { ...state, clickedShareItemEncryptionKey: action.payload };
    case ActionTypes.SET_CURRENT_FOLDER_ID:
      return { ...state, currentFolderId: action.payload };
    case ActionTypes.SET_CURRENT_PARENT_FOLDER_ID:
      return { ...state, currentParentFolderId: action.payload };
    case ActionTypes.SET_CURRENT_SHARE_OWNER_AVATAR:
      return { ...state, currentShareOwnerAvatar: action.payload };
    case ActionTypes.SET_FILES_OWNER_CREDENTIALS:
      return { ...state, filesOwnerCredentials: action.payload };
    case ActionTypes.SET_OWNER_BUCKET:
      return { ...state, ownerBucket: action.payload };
    case ActionTypes.SET_OWNER_ENCRYPTION_KEY:
      return { ...state, ownerEncryptionKey: action.payload };
    default:
      return state;
  }
};

const ShareViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, actionDispatch] = useReducer(reducer, initialState);

  const contextValue: ShareViewContextProps = useMemo(() => {
    return {
      state,
      actionDispatch,
    };
  }, [state, actionDispatch]);

  return <ShareViewContext.Provider value={contextValue}>{children}</ShareViewContext.Provider>;
};

const useShareViewContext = (): ShareViewContextProps => {
  const context = useContext(ShareViewContext);
  if (!context) {
    throw new Error('useShareViewContext must be used within an ShareViewProvider');
  }
  return context;
};

export { ShareViewProvider, useShareViewContext };
