import { BreadcrumbItemData } from '../../../../shared/components/Breadcrumbs/types';
import { FolderPathDialog } from '../../../../drive/types';
import { useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store';
import Breadcrumbs from '../../../../shared/components/Breadcrumbs/Breadcrumbs';

interface BreadcrumbsMoveItemsDialogViewProps {
  onShowFolderContentClicked: (folderId: string, name: string) => void;
  currentNamePaths: FolderPathDialog[];
}

const BreadcrumbsMoveItemsDialogView = (props: BreadcrumbsMoveItemsDialogViewProps) => {
  const { onShowFolderContentClicked, currentNamePaths } = props;
  const isOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);

  const breadcrumbItems = (currentFolderPaths): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    if (currentFolderPaths.length > 0) {
      currentFolderPaths.forEach((path: FolderPathDialog, i: number, namePath: FolderPathDialog[]) => {
        items.push({
          uuid: path.uuid,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          dialog: isOpen,
          onClick: () => onShowFolderContentClicked(path.uuid, path.name),
        });
      });
    }
    return items;
  };

  return <Breadcrumbs items={breadcrumbItems(currentNamePaths)} />;
};

export default BreadcrumbsMoveItemsDialogView;
