import { BreadcrumbItemData, Breadcrumbs, MenuItemType } from '@internxt/ui';
import { DownloadSimpleIcon, EyeIcon } from '@phosphor-icons/react';
import { OrderDirection } from 'app/core/types';
import FileViewer from 'app/drive/components/FileViewer/FileViewer';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { derivePublicSharingKey } from 'app/share/services/share.service';
import { AdvancedSharedItem } from 'app/share/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { OrderField } from 'views/Shared/components/SharedItemList';
import { sortSharedItems } from 'views/Shared/utils/sharedViewUtils';
import usePublicSharedDownload from '../hooks/usePublicSharedDownload';
import usePublicSharedFolderContent from '../hooks/usePublicSharedFolderContent';
import useWarnBeforeUnload from '../hooks/useWarnBeforeUnload';
import mapSharedItemToPreviewFile from '../utils/mapSharedItemToPreviewFile';
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
  const {
    folderPath,
    shareItems,
    credentials,
    nextLevelToken,
    isLoading,
    hasError,
    hasMoreItems,
    onNextPage,
    navigateToFolder,
    navigateToFolderAtIndex,
  } = usePublicSharedFolderContent({ rootFolderUuid, rootFolderName, code });
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const [selectedItems, setSelectedItems] = useState<AdvancedSharedItem[]>([]);
  const [orderBy, setOrderBy] = useState<{ field: OrderField; direction: OrderDirection }>();

  const shareCredentials = credentials ? { user: credentials.networkUser, pass: credentials.networkPass } : undefined;

  const { isDownloading, downloadItems, previewItem, previewBlob, previewProgress, openPreview, closePreview } =
    usePublicSharedDownload({
      credentials: shareCredentials,
      publicShareKey,
      code,
      resourcesToken: nextLevelToken,
    });

  useWarnBeforeUnload(isDownloading);

  const previewFile = useMemo(() => (previewItem ? mapSharedItemToPreviewFile(previewItem) : null), [previewItem]);

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
    } else {
      openPreview(shareItem);
    }
  };

  const previewMenuItem: MenuItemType<AdvancedSharedItem> = {
    name: translate('drive.dropdown.openPreview'),
    icon: EyeIcon,
    action: openPreview,
  };

  const getDownloadMenuItem = (
    onDownload: (shareItem: AdvancedSharedItem) => void,
  ): MenuItemType<AdvancedSharedItem> => ({
    name: translate('drive.dropdown.download'),
    icon: DownloadSimpleIcon,
    action: onDownload,
    disabled: () => isDownloading,
  });

  const getContextMenu = (): MenuItemType<AdvancedSharedItem>[] => {
    if (selectedItems.length > 1) {
      return [getDownloadMenuItem(() => downloadItems(selectedItems))];
    }

    if (selectedItems[0]?.isFolder) {
      return [getDownloadMenuItem((shareItem) => downloadItems([shareItem]))];
    }

    return [previewMenuItem, getDownloadMenuItem((shareItem) => downloadItems([shareItem]))];
  };

  const contextMenu = getContextMenu();

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
    <div className="flex min-h-0 w-full flex-1 flex-col self-stretch px-5">
      {previewItem && previewFile && (
        <FileViewer
          show={!!previewItem}
          file={previewFile}
          onClose={closePreview}
          onDownload={() => {
            const itemToDownload = previewItem;
            closePreview();
            downloadItems([itemToDownload]);
          }}
          progress={previewProgress}
          blob={previewBlob}
          isAuthenticated={isAuthenticated}
          isShareView
          disableVideoStream
        />
      )}
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
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
        <PublicSharedItemList
          shareItems={reorderedShareItems}
          publicShareKey={publicShareKey}
          isLoading={isLoading}
          hasError={hasError}
          hasMoreItems={hasMoreItems}
          onNextPage={onNextPage}
          onClickItem={onClickItem}
          onItemDoubleClicked={onItemDoubleClicked}
          selectedItems={selectedItems}
          onSelectedItemsChanged={handleOnSelectedItemsChanged}
          orderBy={orderBy}
          sortBy={sortBy}
          contextMenu={contextMenu}
        />
      </div>
    </div>
  );
};

export default PublicSharedFolderContent;
