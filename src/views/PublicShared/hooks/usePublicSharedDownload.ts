import { useRef, useState } from 'react';
import { getIsTypeAllowedAndFileExtensionGroupValues } from 'app/drive/components/FileViewer/utils/fileViewerUtils';
import { downloadFile } from 'app/network/download';
import { FileKey, NetworkCredentials } from 'app/network/types/helper-types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { downloadPublicSharedItems } from 'app/share/services/share.service';
import { AdvancedSharedItem } from 'app/share/types';
import { isFileSizePreviewable } from 'services';
import errorService from 'services/error.service';
import { binaryStreamToBlob } from 'services/stream.service';

interface UsePublicSharedDownloadProps {
  credentials?: NetworkCredentials;
  publicShareKey: FileKey;
  code: string;
  resourcesToken?: string;
}

const isTypeAllowed = (shareItem: AdvancedSharedItem) =>
  !!getIsTypeAllowedAndFileExtensionGroupValues(shareItem)?.isTypeAllowed;

const usePublicSharedDownload = ({
  credentials,
  publicShareKey,
  code,
  resourcesToken,
}: UsePublicSharedDownloadProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewItem, setPreviewItem] = useState<AdvancedSharedItem | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewRequestIdRef = useRef(0);

  const downloadItems = (itemsToDownload: AdvancedSharedItem[]) => {
    if (isDownloading || itemsToDownload.length === 0 || !credentials) return;

    setIsDownloading(true);

    downloadPublicSharedItems({
      items: itemsToDownload,
      credentials,
      key: publicShareKey,
      code,
      resourcesToken,
    })
      .catch((err) => {
        errorService.reportError(err);
        notificationsService.show({ text: errorService.castError(err).message, type: ToastType.Error });
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  const closePreview = () => {
    previewRequestIdRef.current += 1;
    setPreviewItem(null);
    setPreviewBlob(null);
    setPreviewProgress(0);
  };

  const openPreview = (shareItem: AdvancedSharedItem) => {
    if (shareItem.isFolder || !credentials) return;

    previewRequestIdRef.current += 1;
    const requestId = previewRequestIdRef.current;
    setPreviewItem(shareItem);
    setPreviewBlob(null);
    setPreviewProgress(0);

    const { bucket, fileId } = shareItem;
    if (!isTypeAllowed(shareItem) || !isFileSizePreviewable(Number(shareItem.size)) || !bucket || !fileId) return;

    downloadFile({
      bucketId: bucket,
      fileId,
      creds: credentials,
      key: publicShareKey,
      options: {
        notifyProgress: (totalBytes, downloadedBytes) => {
          if (previewRequestIdRef.current === requestId) {
            setPreviewProgress(downloadedBytes / totalBytes);
          }
        },
      },
    })
      .then((fileStream) => binaryStreamToBlob(fileStream, shareItem.type || ''))
      .then((fileBlob) => {
        if (previewRequestIdRef.current === requestId) {
          setPreviewBlob(fileBlob);
        }
      })
      .catch((err) => {
        errorService.reportError(err);
        if (previewRequestIdRef.current === requestId) {
          closePreview();
          notificationsService.show({ text: errorService.castError(err).message, type: ToastType.Error });
        }
      });
  };

  return {
    isDownloading,
    downloadItems,
    previewItem,
    previewBlob,
    previewProgress,
    openPreview,
    closePreview,
  };
};

export default usePublicSharedDownload;
