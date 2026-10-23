import { useCallback, useEffect, useRef, useState } from 'react';
import { PreviewFileItem } from 'app/share/types';
import errorService from 'services/error.service';
import { FilePreviewContentSource, getFilePreviewContent } from '../services/filePreviewContent.service';
import { isPreviewableBySize } from '../utils/fileViewerUtils';
import { getFileViewer } from '../viewers';
import { ViewerContentSource } from '../viewers/types';

interface UseFilePreviewContentProps {
  file: PreviewFileItem;
  isEnabled: boolean;
  isWorkspace: boolean;
  onFreshDownload?: (file: PreviewFileItem, blob: Blob) => void;
}

interface PreviewContentState {
  fileId: PreviewFileItem['id'];
  blob: Blob | null;
  progress: number;
  hasFailed: boolean;
}

const needsDownloadToPreview = (file: PreviewFileItem): boolean =>
  getFileViewer(file)?.contentSource === ViewerContentSource.Blob && isPreviewableBySize(file);

export const useFilePreviewContent = ({
  file,
  isEnabled,
  isWorkspace,
  onFreshDownload,
}: UseFilePreviewContentProps) => {
  const [content, setContent] = useState<PreviewContentState | null>(null);
  const latestOnFreshDownload = useRef(onFreshDownload);
  latestOnFreshDownload.current = onFreshDownload;

  const updateContent = useCallback((changes: Partial<PreviewContentState>) => {
    setContent((current) => {
      const hasChanges = !!current && Object.entries(changes).some(([key, value]) => current[key] !== value);
      return hasChanges ? { ...current, ...changes } : current;
    });
  }, []);

  useEffect(() => {
    setContent({ fileId: file.id, blob: null, progress: 0, hasFailed: false });

    if (!isEnabled) return;

    const isEmptyFile = file.size === 0;
    if (isEmptyFile) {
      updateContent({ blob: new Blob([]) });
      return;
    }

    if (!needsDownloadToPreview(file)) return;

    const abortController = new AbortController();
    const isCancelled = () => abortController.signal.aborted;

    getFilePreviewContent(file, {
      isWorkspace,
      abortController,
      onProgress: (progress) => {
        if (!isCancelled()) updateContent({ progress });
      },
    })
      .then(({ blob, source }) => {
        if (isCancelled()) return;
        updateContent({ blob, progress: 0 });
        if (source === FilePreviewContentSource.Download) latestOnFreshDownload.current?.(file, blob);
      })
      .catch((error) => {
        if (isCancelled()) return;
        updateContent({ hasFailed: true });
        errorService.reportError(error);
      });

    return () => abortController.abort();
  }, [file.id, isEnabled, isWorkspace]);

  const updateProgress = useCallback((progress: number) => updateContent({ progress }), [updateContent]);

  const isCurrentFileContent = content?.fileId === file.id;

  return {
    blob: isCurrentFileContent ? content.blob : null,
    progress: isCurrentFileContent ? content.progress : 0,
    hasFailed: isCurrentFileContent && content.hasFailed,
    updateProgress,
  };
};
