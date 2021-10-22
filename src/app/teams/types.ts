export interface TeamsSettings {
  isAdmin: boolean;
  bucket: string;
  bridge_mnemonic: string;
  bridge_password: string;
  bridge_user: string;
  root_folder_id: number;
  total_members: number;
}

export interface InfoInvitationsMembers {
  isMember: boolean;
  isInvitation: boolean;
  user: string;
}
