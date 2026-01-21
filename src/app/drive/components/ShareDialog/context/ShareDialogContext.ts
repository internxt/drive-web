import { createContext, Dispatch } from 'react';
import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { Role } from 'app/store/slices/sharedLinks/types';
import { AccessMode, InvitedUserProps, RequestProps, Views } from '../types';

export interface ShareDialogState {
  view: Views;
  isLoading: boolean;
  roles: Role[];
  inviteDialogRoles: Role[];
  accessMode: AccessMode;
  isPasswordProtected: boolean;
  sharingMeta: SharingMeta | null;
  invitedUsers: InvitedUserProps[];
  currentUserFolderRole?: string;
  selectedUserListIndex: number | null;
  userOptionsEmail?: InvitedUserProps;
  userOptionsY: number;
  showStopSharingConfirmation: boolean;
  openPasswordInput: boolean;
  openPasswordDisableDialog: boolean;
  isRestrictedSharingDialogOpen: boolean;
  isRestrictedPasswordDialogOpen: boolean;
}

export type ShareDialogAction =
  | { type: 'SET_VIEW'; payload: Views }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_ROLES'; payload: Role[] }
  | { type: 'SET_INVITE_DIALOG_ROLES'; payload: Role[] }
  | { type: 'SET_ACCESS_MODE'; payload: AccessMode }
  | { type: 'SET_IS_PASSWORD_PROTECTED'; payload: boolean }
  | { type: 'SET_SHARING_META'; payload: SharingMeta | null }
  | { type: 'SET_INVITED_USERS'; payload: InvitedUserProps[] }
  | { type: 'SET_CURRENT_USER_FOLDER_ROLE'; payload?: string }
  | { type: 'UPDATE_USER_ROLE'; payload: { email: string; roleId: string; roleName: string } }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'UPDATE_REQUEST_STATUS'; payload: { email: string; status: RequestProps['status'] } }
  | { type: 'SET_SELECTED_USER_LIST_INDEX'; payload: number | null }
  | { type: 'SET_USER_OPTIONS_EMAIL'; payload?: InvitedUserProps }
  | { type: 'SET_USER_OPTIONS_Y'; payload: number }
  | { type: 'SET_SHOW_STOP_SHARING_CONFIRMATION'; payload: boolean }
  | { type: 'SET_OPEN_PASSWORD_INPUT'; payload: boolean }
  | { type: 'SET_OPEN_PASSWORD_DISABLE_DIALOG'; payload: boolean }
  | { type: 'SET_IS_RESTRICTED_SHARING_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_IS_RESTRICTED_PASSWORD_DIALOG_OPEN'; payload: boolean }
  | { type: 'RESET_DIALOG_DATA' };

export const ActionTypes = {
  SET_VIEW: 'SET_VIEW',
  SET_IS_LOADING: 'SET_IS_LOADING',
  SET_ROLES: 'SET_ROLES',
  SET_INVITE_DIALOG_ROLES: 'SET_INVITE_DIALOG_ROLES',
  SET_ACCESS_MODE: 'SET_ACCESS_MODE',
  SET_IS_PASSWORD_PROTECTED: 'SET_IS_PASSWORD_PROTECTED',
  SET_SHARING_META: 'SET_SHARING_META',
  SET_INVITED_USERS: 'SET_INVITED_USERS',
  SET_CURRENT_USER_FOLDER_ROLE: 'SET_CURRENT_USER_FOLDER_ROLE',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  REMOVE_USER: 'REMOVE_USER',
  UPDATE_REQUEST_STATUS: 'UPDATE_REQUEST_STATUS',
  SET_SELECTED_USER_LIST_INDEX: 'SET_SELECTED_USER_LIST_INDEX',
  SET_USER_OPTIONS_EMAIL: 'SET_USER_OPTIONS_EMAIL',
  SET_USER_OPTIONS_Y: 'SET_USER_OPTIONS_Y',
  SET_SHOW_STOP_SHARING_CONFIRMATION: 'SET_SHOW_STOP_SHARING_CONFIRMATION',
  SET_OPEN_PASSWORD_INPUT: 'SET_OPEN_PASSWORD_INPUT',
  SET_OPEN_PASSWORD_DISABLE_DIALOG: 'SET_OPEN_PASSWORD_DISABLE_DIALOG',
  SET_IS_RESTRICTED_SHARING_DIALOG_OPEN: 'SET_IS_RESTRICTED_SHARING_DIALOG_OPEN',
  SET_IS_RESTRICTED_PASSWORD_DIALOG_OPEN: 'SET_IS_RESTRICTED_PASSWORD_DIALOG_OPEN',
  RESET_DIALOG_DATA: 'RESET_DIALOG_DATA',
} as const;

export interface ShareDialogContextProps {
  state: ShareDialogState;
  dispatch: Dispatch<ShareDialogAction>;
}

export const ShareDialogContext = createContext<ShareDialogContextProps | undefined>(undefined);
