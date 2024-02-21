export interface BreadcrumbItemData {
  id: number;
  label: string;
  icon: JSX.Element | null;
  active: boolean;
  isFirstPath?: boolean;
  dialog?: boolean;
  isBackup?: boolean;
  onClick?: () => void;
}
