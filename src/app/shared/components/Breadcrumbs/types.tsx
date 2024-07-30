export interface BreadcrumbItemData {
  uuid: string;
  label: string;
  icon: JSX.Element | null;
  active: boolean;
  isFirstPath?: boolean;
  dialog?: boolean;
  isBackup?: boolean;
  onClick?: () => void;
}

export interface BreadcrumbsMenuProps {
  item: BreadcrumbItemData;
  items: BreadcrumbItemData[];
  onItemClicked: (item: BreadcrumbItemData) => void;
}
