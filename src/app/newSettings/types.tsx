export interface SelectSectionProps {
  section: string;
  subsection: string;
}

export interface PreferencesDialogProps {
  haveParamsChanged;
  setHaveParamsChanged;
  isPreferencesDialogOpen: boolean;
}

export interface Section {
  section: string;
  subsection: string;
  title: string;
}

export type Sections = Section[];
