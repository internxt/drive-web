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

export type BillingDetails = {
  address: string;
  addressOptional?: string;
  country: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
};

export type Sections = Section[];
