import { BreadcrumbItemData } from '../types';
import { t } from 'i18next';
import Breadcrumbs from '../../../../shared/components/Breadcrumbs/Breadcrumbs';
import { SharedNamePath } from '../../../../share/types';
import { useShareViewContext } from '../../../../share/views/SharedLinksView/context/SharedViewContextProvider';
import {
  setPage,
  setHasMoreFolders,
  setHasMoreFiles,
  setSelectedItems,
  setCurrentFolderLevelResourcesToken,
  setCurrentFolderId,
} from '../../../../share/views/SharedLinksView/context/SharedViewContext.actions';
import { useAppDispatch } from '../../../../store/hooks';
import { storageActions } from '../../../../store/slices/storage';

interface BreadcrumbsSharedViewProps {
  resetSharedItems: () => void;
  sharedNamePath: SharedNamePath[];
}

const BreadcrumbsSharedView = ({ resetSharedItems, sharedNamePath }: BreadcrumbsSharedViewProps) => {
  const dispatch = useAppDispatch();
  const { state, actionDispatch } = useShareViewContext();

  const { isLoading } = state;

  const goToFolderBredcrumb = (id, name, uuid, token?) => {
    if (!isLoading) {
      actionDispatch(setPage(0));
      actionDispatch(setHasMoreFolders(true));
      actionDispatch(setHasMoreFiles(true));
      resetSharedItems();
      actionDispatch(setSelectedItems([]));
      actionDispatch(setCurrentFolderLevelResourcesToken(token));
      if (id === 1) {
        actionDispatch(setCurrentFolderId(''));
      } else {
        actionDispatch(setCurrentFolderId(uuid));
      }
      dispatch(storageActions.popSharedNamePath({ id: id, name: name, token: token, uuid: uuid }));
    }
  };
  const breadcrumbShareViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];
    const ROOT_FOLDER_ID = 'ROOT_FOLDER_ID';
    items.push({
      uuid: ROOT_FOLDER_ID,
      label: t('shared-links.shared-links'),
      icon: null,
      active: true,
      isFirstPath: true,
      onClick: () => {
        goToFolderBredcrumb(ROOT_FOLDER_ID, t('shared-links.shared-links'), '');
      },
    });

    sharedNamePath.slice().forEach((path: SharedNamePath, i: number, namePath: SharedNamePath[]) => {
      items.push({
        uuid: path.uuid,
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
