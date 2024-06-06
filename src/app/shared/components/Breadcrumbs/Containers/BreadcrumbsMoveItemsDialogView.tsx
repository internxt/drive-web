import { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/types';
import { FolderPathDialog } from 'app/drive/types';
import { useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import Breadcrumbs from 'app/shared/components/Breadcrumbs/Breadcrumbs';

interface BreadcrumbsMoveItemsDialogViewProps {
  onShowFolderContentClicked: (folderId: number, name: string) => void;
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
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          dialog: isOpen,
          onClick: () => onShowFolderContentClicked(path.id, path.name),
        });
      });
    }
    return items;
  };

  return <Breadcrumbs items={breadcrumbItems(currentNamePaths)} />;
};

export default BreadcrumbsMoveItemsDialogView;
