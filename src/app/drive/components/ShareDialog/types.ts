export type AccessMode = 'public' | 'restricted';
export type UserRole = 'owner' | 'editor' | 'reader';
export type Views = 'general' | 'invite' | 'requests';
export type RequestStatus = 'pending' | 'accepted' | 'denied';

export const REQUEST_STATUS = {
  PENDING: 'pending' as RequestStatus,
  ACCEPTED: 'accepted' as RequestStatus,
  DENIED: 'denied' as RequestStatus,
};

export interface InvitedUserProps {
  avatar: string | null;
  name: string;
  lastname: string;
  email: string;
  roleName: UserRole;
  uuid: string;
  sharingId: string;
}

export interface RequestProps {
  avatar: string;
  name: string;
  lastname: string;
  email: string;
  message?: string;
  status: RequestStatus;
}

export interface ViewProps {
  view: Views;
}
