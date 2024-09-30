import { ReactNode } from 'react';
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

export interface TabsProps {
  tabs: TypeTabs;
  activeTab: ActiveTab;
  setActiveTab: (activeTab) => void;
}

export interface ActivityTabProps {
  role: MemberRole;
  isActivityEnabled: boolean;
  activity: Activity;
}

export interface TeamsTabProps {
  role: string;
  teams: Teams;
  isTeams: boolean;
}
export interface ActivityFiltersProps {
  selectedRoles: string[];
  setIsSelectedRoles: (selectedRoles) => void;
}

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
  isActivityEnabled: boolean;
  activity: Activity;
  isTeams: boolean;
  teams: Teams;
};

export type Teams = {
  team: string;
  role: MemberRole;
}[];

export type ActiveTab = {
  name: string;
  tab: string;
  view: ReactNode;
};

export type TypeTabs = ActiveTab[];

export type Activity = {
  date: string;
  records: {
    title: string;
    description: string;
    time: string;
  }[];
}[];
