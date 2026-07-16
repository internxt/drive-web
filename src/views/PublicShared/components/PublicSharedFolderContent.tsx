import { BreadcrumbItemData, Breadcrumbs } from '@internxt/ui';
import { OrderDirection } from 'app/core/types';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { derivePublicSharingKey } from 'app/share/services/share.service';
import { AdvancedSharedItem } from 'app/share/types';
import { useAppDispatch } from 'app/store/hooks';
import { useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { OrderField } from 'views/Shared/components/SharedItemList';
import { sortSharedItems } from 'views/Shared/utils/sharedViewUtils';
import usePublicSharedFolderContent from '../hooks/usePublicSharedFolderContent';
import PublicSharedItemList from './PublicSharedItemList';

interface PublicSharedFolderContentProps {
  rootFolderUuid: string;
  rootFolderName: string;
  code: string;
  encryptionKey: string;
  sharingVersion: string;
  onExitPreview: () => void;
}

const SHARED_ROOT_BREADCRUMB_ID = 'ROOT_FOLDER_ID';

const PublicSharedFolderContent = ({
  rootFolderUuid,
  rootFolderName,
  code,
  encryptionKey,
  sharingVersion,
  onExitPreview,
}: PublicSharedFolderContentProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const publicShareKey = useMemo(
    () => derivePublicSharingKey({ encryptionKey, code, sharingVersion }),
    [encryptionKey, code, sharingVersion],
  );
  const { folderPath, shareItems, isLoading, hasMoreItems, onNextPage, navigateToFolder, navigateToFolderAtIndex } =
    usePublicSharedFolderContent({ rootFolderUuid, rootFolderName, code });
  const [selectedItems, setSelectedItems] = useState<AdvancedSharedItem[]>([]);
  const [orderBy, setOrderBy] = useState<{ field: OrderField; direction: OrderDirection }>();

  const reorderedShareItems = sortSharedItems(shareItems, orderBy);

  const sortBy = (value: { field: OrderField; direction: 'ASC' | 'DESC' }) => {
    const isSameField = orderBy?.field === value.field;
    const isDescOrder = orderBy?.direction === OrderDirection.Desc;

    const hasDescOrder = isSameField && isDescOrder;
    const direction = hasDescOrder ? OrderDirection.Asc : OrderDirection.Desc;

    setOrderBy({ field: value.field, direction });
  };

  const handleOnSelectedItemsChanged = (changes: { props: AdvancedSharedItem; value: boolean }[]) => {
    let updatedSelectedItems = selectedItems;

    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.props.id);
      if (change.value) {
        updatedSelectedItems = [...updatedSelectedItems, change.props];
      }
    }

    setSelectedItems(updatedSelectedItems);
  };

  const onClickItem = (shareItem: AdvancedSharedItem) => {
    const unselectedItems = selectedItems.map((selectedItem) => ({ props: selectedItem, value: false }));
    handleOnSelectedItemsChanged([...unselectedItems, { props: shareItem, value: true }]);
  };

  const onItemDoubleClicked = (shareItem: AdvancedSharedItem) => {
    if (shareItem.isFolder) {
      setSelectedItems([]);
      navigateToFolder(shareItem);
    }
  };

  const goToFolderBreadcrumb = (index: number) => {
    setSelectedItems([]);
    navigateToFolderAtIndex(index);
  };

  const breadcrumbItems: BreadcrumbItemData[] = [
    {
      uuid: SHARED_ROOT_BREADCRUMB_ID,
      label: translate('shared-links.shared-links'),
      icon: null,
      active: true,
      isFirstPath: true,
      onClick: onExitPreview,
    },
    ...folderPath.map((level, index) => ({
      uuid: level.uuid,
      label: level.name,
      icon: null,
      active: index < folderPath.length - 1,
      onClick: () => goToFolderBreadcrumb(index),
    })),
  ];

  return (
    <div className="flex h-full w-full flex-col px-5">
      <div className="z-10 flex h-14 w-full shrink-0 flex-row items-center">
        <Breadcrumbs
          items={breadcrumbItems}
          namePath={[]}
          isSomeItemSelected={false}
          selectedItems={[]}
          onItemDropped={() => async () => undefined}
          canItemDrop={() => () => false}
          dispatch={dispatch}
          acceptedTypes={[]}
          itemComponent={iconService.getItemIcon(true)}
          useDrop={useDrop}
        />
      </div>
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <PublicSharedItemList
          shareItems={reorderedShareItems}
          publicShareKey={publicShareKey}
          isLoading={isLoading}
          hasMoreItems={hasMoreItems}
          onNextPage={onNextPage}
          onClickItem={onClickItem}
          onItemDoubleClicked={onItemDoubleClicked}
          selectedItems={selectedItems}
          onSelectedItemsChanged={handleOnSelectedItemsChanged}
          orderBy={orderBy}
          sortBy={sortBy}
        />
      </div>
    </div>
  );
};

export default PublicSharedFolderContent;
