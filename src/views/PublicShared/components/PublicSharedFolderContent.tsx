import { BreadcrumbItemData, Breadcrumbs, MenuItemType } from '@internxt/ui';
import { DownloadSimpleIcon, EyeIcon } from '@phosphor-icons/react';
import { OrderDirection } from 'app/core/types';
import FileViewer from 'app/drive/components/FileViewer/FileViewer';
import { getIsTypeAllowedAndFileExtensionGroupValues } from 'app/drive/components/FileViewer/utils/fileViewerUtils';
import iconService from 'app/drive/services/icon.service';
import { DriveFileData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { downloadFile } from 'app/network/download';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { derivePublicSharingKey, downloadPublicSharedItems } from 'app/share/services/share.service';
import { AdvancedSharedItem } from 'app/share/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { isFileSizePreviewable } from 'services';
import errorService from 'services/error.service';
import { binaryStreamToBlob } from 'services/stream.service';
import { OrderField } from 'views/Shared/components/SharedItemList';
import { sortSharedItems } from 'views/Shared/utils/sharedViewUtils';
import usePublicSharedFolderContent from '../hooks/usePublicSharedFolderContent';
import useWarnBeforeUnload from '../hooks/useWarnBeforeUnload';
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
    hasMoreItems,
    onNextPage,
    navigateToFolder,
    navigateToFolderAtIndex,
  } = usePublicSharedFolderContent({ rootFolderUuid, rootFolderName, code });
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const [selectedItems, setSelectedItems] = useState<AdvancedSharedItem[]>([]);
  const [orderBy, setOrderBy] = useState<{ field: OrderField; direction: OrderDirection }>();
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewItem, setPreviewItem] = useState<AdvancedSharedItem | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);

  const shareCredentials = credentials ? { user: credentials.networkUser, pass: credentials.networkPass } : undefined;

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

  const downloadItems = (itemsToDownload: AdvancedSharedItem[]) => {
    if (isDownloading || itemsToDownload.length === 0 || !shareCredentials) return;

    setIsDownloading(true);

    downloadPublicSharedItems({
      items: itemsToDownload,
      credentials: shareCredentials,
      key: publicShareKey,
      code,
      resourcesToken: nextLevelToken,
    })
      .catch((err) => {
        errorService.reportError(err);
        notificationsService.show({ text: errorService.castError(err).message, type: ToastType.Error });
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  useWarnBeforeUnload(isDownloading);

  const isTypeAllowed = (shareItem: AdvancedSharedItem) =>
    !!getIsTypeAllowedAndFileExtensionGroupValues(shareItem as unknown as DriveFileData)?.isTypeAllowed;

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewBlob(null);
    setPreviewProgress(0);
  };

  const openPreview = (shareItem: AdvancedSharedItem) => {
    if (shareItem.isFolder || !shareCredentials) return;

    setPreviewItem(shareItem);

    if (!isTypeAllowed(shareItem) || !isFileSizePreviewable(Number(shareItem.size))) return;

    downloadFile({
      bucketId: (shareItem as unknown as DriveFileData).bucket,
      fileId: (shareItem as unknown as DriveFileData).fileId,
      creds: shareCredentials,
      key: publicShareKey,
      options: {
        notifyProgress: (totalBytes, downloadedBytes) => {
          setPreviewProgress(downloadedBytes / totalBytes);
        },
      },
    })
      .then((fileStream) => binaryStreamToBlob(fileStream, shareItem.type || ''))
      .then((fileBlob) => {
        setPreviewBlob(fileBlob);
      })
      .catch((err) => {
        closePreview();
        errorService.reportError(err);
        notificationsService.show({ text: errorService.castError(err).message, type: ToastType.Error });
      });
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
    <div className="flex h-full w-full flex-col px-5">
      {previewItem && (
        <FileViewer
          show={!!previewItem}
          file={previewItem as unknown as DriveFileData}
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
          contextMenu={contextMenu}
        />
      </div>
    </div>
  );
};

export default PublicSharedFolderContent;
