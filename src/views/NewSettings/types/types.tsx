export interface SelectSectionProps {
  section: string;
  subsection?: string;
  workspaceUuid?: string;
}

export interface PreferencesDialogProps {
  haveParamsChanged: boolean;
  isPreferencesDialogOpen: boolean;
}

export interface Section {
  section: string;
  subsection?: string;
}

export interface BillingDetailsCardProps {
  address: string;
  phone: string;
  owner?: string;
  isOwner?: boolean;
  onEditButtonClick: () => void;
}

export type DriveProduct = {
  name: string;
  usageInBytes: number;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'pink' | 'indigo' | 'primary' | 'gray';
};

export type MemberRole = 'owner' | 'manager' | 'member' | 'deactivated' | 'current' | 'planType';
