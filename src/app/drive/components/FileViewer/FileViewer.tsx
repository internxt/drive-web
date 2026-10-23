import { Dialog, DialogBackdrop, Transition } from '@headlessui/react';
import { Fragment, Suspense, memo, useCallback, useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { isFileSizePreviewable } from 'services/media.service';
import iconService from 'app/drive/services/icon.service';
import { bytesToString } from 'app/drive/services/size.service';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { PreviewFileItem } from 'app/share/types';
import ShareItemDialog from '../../../../views/Shared/components/ShareItemDialog/ShareItemDialog';
import FileNavigationArrows from './components/FileNavigationArrows';
import FilePreviewLoading from './components/FilePreviewLoading';
import FileViewerTopBar from './components/FileViewerTopBar';
import { NoPreviewIsAvailableComponent } from './components/NoPreviewIsAvailableComponent';
import { useNestedDialogsEscape } from './hooks/useNestedDialogsEscape';
import { FileViewerKeyboardShortcuts, FileViewerNavigation, TopBarActionsMenu } from './types';
import { getFileDisplayName, getPreviewSizeLimitBytes, isPreviewableBySize } from './utils/fileViewerUtils';
import { FileViewerEntry, getFileViewer } from './viewers';
import { FileContentViewerProps, ViewerContentSource } from './viewers/types';

const PreviewShareItemDialog = memo(ShareItemDialog);

const FileContent = memo(
  ({ fileViewer, ...viewerProps }: FileContentViewerProps & { fileViewer: FileViewerEntry }): JSX.Element => (
    <Suspense fallback={<div></div>}>
      <fileViewer.Viewer {...viewerProps} />
    </Suspense>
  ),
);

interface FileViewerProps {
  file: DriveFileData;
  onClose: () => void;
  onDownload: () => void;
  show: boolean;
  isAuthenticated: boolean;
  progress?: number;
  isShareView?: boolean;
  disableVideoStream?: boolean;
  blob?: Blob | null;
  hasPreviewFailed?: boolean;
  navigation?: FileViewerNavigation;
  dropdownItems?: TopBarActionsMenu;
  keyboardShortcuts?: FileViewerKeyboardShortcuts;
  onProgress?: (progress: number) => void;
  onConvertedContent?: (file: PreviewFileItem, content: Blob) => Promise<void>;
}

const FileViewer = ({
  file,
  onClose,
  onDownload,
  show,
  progress,
  isAuthenticated,
  isShareView,
  disableVideoStream,
  blob,
  hasPreviewFailed,
  navigation,
  dropdownItems,
  keyboardShortcuts,
  onProgress,
  onConvertedContent,
}: FileViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [failedFileId, setFailedFileId] = useState<DriveFileData['id'] | null>(null);

  const fileViewer = getFileViewer(file);
  const isTypeAllowed = !!fileViewer;
  const isStreamed = fileViewer?.contentSource === ViewerContentSource.Stream && !disableVideoStream;
  const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
  const isVideoStreaming = isStreamed && (!isSafari || isFileSizePreviewable(file.size));
  const shouldRenderThePreview = isTypeAllowed && (isVideoStreaming || isPreviewableBySize(file));
  const isTooLargeToPreview = isTypeAllowed && !isPreviewableBySize(file);
  const isItemValidToPreview = show && shouldRenderThePreview && failedFileId !== file.id && !hasPreviewFailed;
  const canGoToPrevious = !isShareView && !!navigation?.hasPrevious;
  const canGoToNext = !isShareView && !!navigation?.hasNext;

  const onViewerError = useCallback(() => setFailedFileId(file.id), [file.id]);

  useNestedDialogsEscape();

  useEffect(() => {
    const preventBrowserContextMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener('contextmenu', preventBrowserContextMenu);
    return () => document.removeEventListener('contextmenu', preventBrowserContextMenu);
  }, []);

  useHotkeys('right', () => navigation?.goToNext(), { enabled: canGoToNext }, [canGoToNext, navigation]);

  useHotkeys('left', () => navigation?.goToPrevious(), { enabled: canGoToPrevious }, [canGoToPrevious, navigation]);

  useHotkeys('r', () => keyboardShortcuts?.renameItemFromKeyboard?.(file as DriveItemData));

  useHotkeys('backspace', () => keyboardShortcuts?.removeItemFromKeyboard?.(file as DriveItemData));

  return (
    <Transition
      show={show}
      appear
      as={Fragment}
      enter="ease-out duration-150"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Dialog
        as="div"
        className="hide-scroll fixed inset-0 z-50 flex flex-col items-center justify-start text-white"
        onClose={onClose}
      >
        <div className="flex h-screen w-screen flex-col items-center justify-center">
          <DialogBackdrop className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

          <PreviewShareItemDialog share={file.shares?.[0]} isPreviewView item={file as DriveItemData} />

          {isItemValidToPreview ? (
            <div
              tabIndex={0}
              className="z-10 flex max-h-full max-w-full flex-col items-start justify-start overflow-auto outline-none"
            >
              <div>
                {fileViewer && (isStreamed || blob) ? (
                  <FileContent
                    key={file.id}
                    fileViewer={fileViewer}
                    blob={blob ?? null}
                    file={file}
                    disableVideoStream={disableVideoStream}
                    onError={onViewerError}
                    onProgress={onProgress}
                    onConvertedContent={onConvertedContent}
                  />
                ) : null}

                <FilePreviewLoading file={file} progress={progress} hasContent={!!blob} />
              </div>
            </div>
          ) : (
            <NoPreviewIsAvailableComponent
              ItemIconComponent={iconService.getItemIcon(false, file.type)}
              fileName={getFileDisplayName(file)}
              onDownload={onDownload}
              translate={translate}
              reason={
                isTooLargeToPreview
                  ? translate('error.filePreviewTooLarge', { limit: bytesToString(getPreviewSizeLimitBytes(file)) })
                  : undefined
              }
            />
          )}

          <FileNavigationArrows
            canGoToPrevious={canGoToPrevious}
            canGoToNext={canGoToNext}
            onPrevious={navigation?.goToPrevious}
            onNext={navigation?.goToNext}
          />

          <FileViewerTopBar
            file={file}
            isAuthenticated={isAuthenticated}
            isShareView={isShareView}
            dropdownItems={dropdownItems}
            onClose={onClose}
            onDownload={onDownload}
          />
        </div>
      </Dialog>
    </Transition>
  );
};

export default FileViewer;
