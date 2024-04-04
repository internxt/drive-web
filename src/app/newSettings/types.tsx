export interface SelectSectionProps {
  section: string;
  subsection?: string;
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
  owner: string;
  isOwner: boolean;
  onEditButtonClick: () => void;
}

export type BillingDetails = {
  address: string;
  addressOptional?: string;
  country: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
};

export type DriveProduct = {
  name: string;
  usageInBytes: number;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'pink' | 'indigo' | 'primary' | 'gray';
};

export type Sections = Section[];
