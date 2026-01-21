export type AccessMode = 'public' | 'restricted';
export type UserRole = 'owner' | 'editor' | 'reader';
export type Views = 'general' | 'invite' | 'requests';
export type RequestStatus = 'pending' | 'accepted' | 'denied';

export interface InvitedUserProps {
  avatar: string | null;
  name: string;
  lastname: string;
  email: string;
  roleName: UserRole;
  uuid: string;
  sharingId: string;
}

export interface ViewProps {
  view: Views;
}
