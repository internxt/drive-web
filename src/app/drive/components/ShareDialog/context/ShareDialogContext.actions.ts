import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { Role } from 'app/store/slices/sharedLinks/types';
import { AccessMode, InvitedUserProps, RequestProps, Views } from '../types';
import { ShareDialogAction, ActionTypes } from './ShareDialogContext';

export const setView = (payload: Views): ShareDialogAction => ({
  type: ActionTypes.SET_VIEW,
  payload,
});

export const setIsLoading = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_IS_LOADING,
  payload,
});

export const setRoles = (payload: Role[]): ShareDialogAction => ({
  type: ActionTypes.SET_ROLES,
  payload,
});

export const setInviteDialogRoles = (payload: Role[]): ShareDialogAction => ({
  type: ActionTypes.SET_INVITE_DIALOG_ROLES,
  payload,
});

export const setAccessMode = (payload: AccessMode): ShareDialogAction => ({
  type: ActionTypes.SET_ACCESS_MODE,
  payload,
});

export const setIsPasswordProtected = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_IS_PASSWORD_PROTECTED,
  payload,
});

export const setSharingMeta = (payload: SharingMeta | null): ShareDialogAction => ({
  type: ActionTypes.SET_SHARING_META,
  payload,
});

export const setInvitedUsers = (payload: InvitedUserProps[]): ShareDialogAction => ({
  type: ActionTypes.SET_INVITED_USERS,
  payload,
});

export const setCurrentUserFolderRole = (payload?: string): ShareDialogAction => ({
  type: ActionTypes.SET_CURRENT_USER_FOLDER_ROLE,
  payload,
});

export const updateUserRole = (payload: { email: string; roleId: string; roleName: string }): ShareDialogAction => ({
  type: ActionTypes.UPDATE_USER_ROLE,
  payload,
});

export const removeUser = (payload: string): ShareDialogAction => ({
  type: ActionTypes.REMOVE_USER,
  payload,
});

export const updateRequestStatus = (payload: { email: string; status: RequestProps['status'] }): ShareDialogAction => ({
  type: ActionTypes.UPDATE_REQUEST_STATUS,
  payload,
});

export const setSelectedUserListIndex = (payload: number | null): ShareDialogAction => ({
  type: ActionTypes.SET_SELECTED_USER_LIST_INDEX,
  payload,
});

export const setUserOptionsEmail = (payload?: InvitedUserProps): ShareDialogAction => ({
  type: ActionTypes.SET_USER_OPTIONS_EMAIL,
  payload,
});

export const setUserOptionsY = (payload: number): ShareDialogAction => ({
  type: ActionTypes.SET_USER_OPTIONS_Y,
  payload,
});

export const setShowStopSharingConfirmation = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_SHOW_STOP_SHARING_CONFIRMATION,
  payload,
});

export const setOpenPasswordInput = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_OPEN_PASSWORD_INPUT,
  payload,
});

export const setOpenPasswordDisableDialog = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_OPEN_PASSWORD_DISABLE_DIALOG,
  payload,
});

export const setIsRestrictedSharingDialogOpen = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_IS_RESTRICTED_SHARING_DIALOG_OPEN,
  payload,
});

export const setIsRestrictedPasswordDialogOpen = (payload: boolean): ShareDialogAction => ({
  type: ActionTypes.SET_IS_RESTRICTED_PASSWORD_DIALOG_OPEN,
  payload,
});

export const resetDialogData = (): ShareDialogAction => ({
  type: ActionTypes.RESET_DIALOG_DATA,
});
