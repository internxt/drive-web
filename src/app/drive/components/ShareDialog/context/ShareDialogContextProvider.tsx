import React, { useContext, useReducer, ReactNode, useMemo } from 'react';
import {
  ShareDialogAction,
  ShareDialogState,
  ShareDialogContext,
  ShareDialogContextProps,
  ActionTypes,
} from './ShareDialogContext';
import { UserRole } from '../types';

const initialState: ShareDialogState = {
  view: 'general',
  isLoading: false,
  roles: [],
  inviteDialogRoles: [],
  accessMode: 'restricted',
  isPasswordProtected: false,
  sharingMeta: null,
  invitedUsers: [],
  currentUserFolderRole: undefined,
  selectedUserListIndex: null,
  userOptionsEmail: undefined,
  userOptionsY: 0,
  showStopSharingConfirmation: false,
  openPasswordInput: false,
  openPasswordDisableDialog: false,
  isRestrictedSharingDialogOpen: false,
  isRestrictedPasswordDialogOpen: false,
};

const reducer = (state: ShareDialogState, action: ShareDialogAction): ShareDialogState => {
  switch (action.type) {
    case ActionTypes.SET_VIEW:
      return { ...state, view: action.payload };

    case ActionTypes.SET_IS_LOADING:
      return { ...state, isLoading: action.payload };

    case ActionTypes.SET_ROLES:
      return { ...state, roles: action.payload };

    case ActionTypes.SET_INVITE_DIALOG_ROLES:
      return { ...state, inviteDialogRoles: action.payload };

    case ActionTypes.SET_ACCESS_MODE:
      return { ...state, accessMode: action.payload };

    case ActionTypes.SET_IS_PASSWORD_PROTECTED:
      return { ...state, isPasswordProtected: action.payload };

    case ActionTypes.SET_SHARING_META:
      return { ...state, sharingMeta: action.payload };

    case ActionTypes.SET_INVITED_USERS:
      return { ...state, invitedUsers: action.payload };

    case ActionTypes.SET_CURRENT_USER_FOLDER_ROLE:
      return { ...state, currentUserFolderRole: action.payload };

    case ActionTypes.UPDATE_USER_ROLE:
      return {
        ...state,
        invitedUsers: state.invitedUsers.map((user) =>
          user.email === action.payload.email
            ? { ...user, roleId: action.payload.roleId, roleName: action.payload.roleName as UserRole }
            : user,
        ),
      };

    case ActionTypes.REMOVE_USER:
      return {
        ...state,
        invitedUsers: state.invitedUsers.filter((user) => user.uuid !== action.payload),
      };

    case ActionTypes.SET_SELECTED_USER_LIST_INDEX:
      return { ...state, selectedUserListIndex: action.payload };

    case ActionTypes.SET_USER_OPTIONS_EMAIL:
      return { ...state, userOptionsEmail: action.payload };

    case ActionTypes.SET_USER_OPTIONS_Y:
      return { ...state, userOptionsY: action.payload };

    case ActionTypes.SET_SHOW_STOP_SHARING_CONFIRMATION:
      return { ...state, showStopSharingConfirmation: action.payload };

    case ActionTypes.SET_OPEN_PASSWORD_INPUT:
      return { ...state, openPasswordInput: action.payload };

    case ActionTypes.SET_OPEN_PASSWORD_DISABLE_DIALOG:
      return { ...state, openPasswordDisableDialog: action.payload };

    case ActionTypes.SET_IS_RESTRICTED_SHARING_DIALOG_OPEN:
      return { ...state, isRestrictedSharingDialogOpen: action.payload };

    case ActionTypes.SET_IS_RESTRICTED_PASSWORD_DIALOG_OPEN:
      return { ...state, isRestrictedPasswordDialogOpen: action.payload };

    case ActionTypes.RESET_DIALOG_DATA:
      return {
        ...initialState,
        roles: state.roles,
        inviteDialogRoles: state.inviteDialogRoles,
      };

    default:
      return state;
  }
};

const ShareDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const contextValue: ShareDialogContextProps = useMemo(() => {
    return {
      state,
      dispatch,
    };
  }, [state, dispatch]);

  return <ShareDialogContext.Provider value={contextValue}>{children}</ShareDialogContext.Provider>;
};

const useShareDialogContext = (): ShareDialogContextProps => {
  const context = useContext(ShareDialogContext);
  if (!context) {
    throw new Error('useShareDialogContext must be used within a ShareDialogProvider');
  }
  return context;
};

export { ShareDialogProvider, useShareDialogContext };
