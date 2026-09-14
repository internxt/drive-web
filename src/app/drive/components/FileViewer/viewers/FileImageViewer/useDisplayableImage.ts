import heic2any from 'heic2any';
import { useEffect, useMemo, useState } from 'react';

import { convertImageForPreview } from 'app/drive/services/image-preview.service';
import { convertibleImageExtensions, heicImageExtensions } from 'app/drive/types/file-types';
import { FormatFileViewerProps } from '../../FileViewer';

const PROGRESS_BAR_STATUS = {
  PENDING: 0.95,
  COMPLETED: 1,
};

const FILE_TYPE_BY_MIME: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const DEFAULT_CONVERTED_FILE_TYPE = 'jpg';

interface UseDisplayableImageProps
  extends Pick<FormatFileViewerProps, 'file' | 'blob' | 'handlersForSpecialItems' | 'setIsPreviewAvailable'> {
  extension: string;
}

interface DisplayableImage {
  fileUrl: string;
  isConverting: boolean;
}

const convertToDisplayableBlob = (blob: Blob, extension: string): Promise<Blob> =>
  heicImageExtensions.includes(extension)
    ? (heic2any({ blob }) as Promise<Blob>)
    : convertImageForPreview(blob, extension);

const getConvertedFileType = (blob: Blob): string => FILE_TYPE_BY_MIME[blob.type] ?? DEFAULT_CONVERTED_FILE_TYPE;

/**
 * Resolves the object URL the viewer can render for `blob`, converting HEIC, TIFF and RAW
 * files in memory first. The stored file is never modified; the converted blob also feeds
 * the thumbnail. The object URL is revoked when it changes or the component unmounts.
 */
export const useDisplayableImage = ({
  file,
  blob,
  extension,
  handlersForSpecialItems,
  setIsPreviewAvailable,
}: UseDisplayableImageProps): DisplayableImage => {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const isConvertibleImage = convertibleImageExtensions.includes(extension);

  useEffect(() => {
    if (!blob) {
      setIsPreviewAvailable(false);
      return;
    }
    if (!isConvertibleImage) {
      setImageBlob(blob);
      return;
    }

    let isCancelled = false;

    const convert = async () => {
      setIsConverting(true);
      handlersForSpecialItems?.handleUpdateProgress(PROGRESS_BAR_STATUS.PENDING);

      try {
        const convertedBlob = await convertToDisplayableBlob(blob, extension);
        if (isCancelled) return;

        setImageBlob(convertedBlob);
        handlersForSpecialItems?.handleUpdateProgress(PROGRESS_BAR_STATUS.COMPLETED);
        await handlersForSpecialItems?.handleUpdateThumbnail(
          { ...file, type: getConvertedFileType(convertedBlob) },
          convertedBlob,
        );
      } catch (error) {
        if (isCancelled) return;

        console.error(`Error converting ${extension} image for preview:`, error);
        setIsPreviewAvailable(false);
        handlersForSpecialItems?.handleUpdateProgress(PROGRESS_BAR_STATUS.COMPLETED);
      } finally {
        if (!isCancelled) setIsConverting(false);
      }
    };

    convert();

    return () => {
      isCancelled = true;
    };
  }, [blob]);

  const fileUrl = useMemo(() => (imageBlob ? URL.createObjectURL(imageBlob) : ''), [imageBlob]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  return { fileUrl, isConverting };
};
