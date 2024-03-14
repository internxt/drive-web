export interface SelectSectionProps {
  section: string;
  subsection: string;
}

export interface PreferencesDialogProps {
  haveParamsChanged: boolean;
  isPreferencesDialogOpen: boolean;
}

export interface Section {
  section: string;
  subsection: string;
  title: string;
}

export type Sections = Section[];
