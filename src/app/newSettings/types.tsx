import { ReactNode } from 'react';
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

export interface TabsProps {
  tabs: TypeTabs;
  activeTab: ActiveTab;
  setActiveTab: (activeTab) => void;
}

export interface ActivityTabProps {
  user: User;
  activity: Activity;
}

export interface TeamsTabProps {
  user: User;
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

export type MemberRole = 'owner' | 'manager' | 'member' | 'deactivated' | 'current';

export type Member = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: MemberRole;
  storage: number;
  products: DriveProduct[];
};

export type ActiveTab = { title: string; view: ReactNode };

export type TypeTabs = ActiveTab[];

export type User = {
  role: string;
  teams: string[];
};

export type Activity = {
  date: string;
  records: {
    title: string;
    description: string;
    time: string;
  }[];
}[];
