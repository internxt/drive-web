import { t } from 'i18next';
import { SharedNamePath } from 'app/share/types';
import { useShareViewContext } from 'app/share/views/SharedLinksView/context/SharedViewContextProvider';
import {
  setPage,
  setHasMoreFolders,
  setHasMoreFiles,
  setSelectedItems,
  setCurrentFolderLevelResourcesToken,
  setCurrentFolderId,
} from 'app/share/views/SharedLinksView/context/SharedViewContext.actions';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import { canItemDrop, onItemDropped } from '../helper';
import iconService from 'app/drive/services/icon.service';
import { DragAndDropType } from 'app/core/types';
import { NativeTypes } from 'react-dnd-html5-backend';
import { BreadcrumbItemData, Breadcrumbs } from '@internxt/ui';
import { useDrop } from 'react-dnd';

interface BreadcrumbsSharedViewProps {
  resetSharedItems: () => void;
  sharedNamePath: SharedNamePath[];
}

const BreadcrumbsSharedView = ({ resetSharedItems, sharedNamePath }: BreadcrumbsSharedViewProps) => {
  const dispatch = useAppDispatch();
  const { state, actionDispatch } = useShareViewContext();

  const { isLoading } = state;

  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);

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

  return (
    <Breadcrumbs
      items={breadcrumbShareViewItems()}
      namePath={namePath}
      isSomeItemSelected={isSomeItemSelected}
      selectedItems={selectedItems}
      onItemDropped={onItemDropped}
      canItemDrop={canItemDrop}
      dispatch={dispatch}
      acceptedTypes={[NativeTypes.FILE, DragAndDropType.DriveItem]}
      itemComponent={iconService.getItemIcon(true)}
      useDrop={useDrop}
    />
  );
};

export default BreadcrumbsSharedView;
