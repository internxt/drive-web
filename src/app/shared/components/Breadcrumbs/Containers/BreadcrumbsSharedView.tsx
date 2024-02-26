import { BreadcrumbItemData } from '../types';
import { t } from 'i18next';
import Breadcrumbs from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import { SharedNamePath } from 'app/share/types';

interface BreadcrumbsSharedViewProps {
  goToRootSharedBreadcrumb: () => void;
  goToFolderBredcrumb: (pathId: number, pathName: string, pathUuid: string, pathToken: string | null) => void;
  sharedNamePath: SharedNamePath[];
}

const BreadcrumbsSharedView = ({
  goToRootSharedBreadcrumb,
  goToFolderBredcrumb,
  sharedNamePath,
}: BreadcrumbsSharedViewProps) => {
  const breadcrumbShareViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];
    items.push({
      id: 1,
      label: t('shared-links.shared-links'),
      icon: null,
      active: true,
      isFirstPath: true,
      onClick: () => {
        goToRootSharedBreadcrumb();
      },
    });
    sharedNamePath.slice().forEach((path: SharedNamePath, i: number, namePath: SharedNamePath[]) => {
      items.push({
        id: path.id,
        label: path.name,
        icon: null,
        active: i < namePath.length - 1,
        onClick: () => goToFolderBredcrumb(path.id, path.name, path.uuid, path.token),
      });
    });
    return items;
  };

  return <Breadcrumbs items={breadcrumbShareViewItems()} />;
};

export default BreadcrumbsSharedView;
