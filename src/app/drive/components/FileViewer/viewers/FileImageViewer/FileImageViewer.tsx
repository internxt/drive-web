import { useEffect, useState } from 'react';
import heic2any from 'heic2any';

import { FormatFileViewerProps } from '../../FileViewer';

import './FileImageViewer.scss';

const PROGRESS_BAR_STATUS = {
  PENDING: 0.95,
  COMPLETED: 1,
};

const FileImageViewer = ({
  file,
  blob,
  handlersForSpecialItems,
  setIsPreviewAvailable,
}: FormatFileViewerProps): JSX.Element => {
  const [imageBlob, setImageBlob] = useState<Blob | null>();

  useEffect(() => {
    const convertHeicToAny = async () => {
      try {
        if (file.type.toLowerCase() === 'heic') {
          const updatedFile = { ...file };
          handlersForSpecialItems?.handleUpdateProgress(PROGRESS_BAR_STATUS.PENDING);

          const convertedBlob = await heic2any({ blob: blob });
          updatedFile.type = 'png';

          setImageBlob(convertedBlob as Blob);

          await handlersForSpecialItems?.handleUpdateThumbnail(updatedFile, convertedBlob as Blob);
        } else {
          setImageBlob(blob);
        }
      } catch (error) {
        console.error('Error converting HEIC to another format:', error);
        setIsPreviewAvailable(false);
      } finally {
        handlersForSpecialItems?.handleUpdateProgress(PROGRESS_BAR_STATUS.COMPLETED);
      }
    };

    convertHeicToAny();
  }, [blob]);

  useEffect(() => {
    return () => {
      // Cleanup the object URL when the component unmounts or when the imageBlob changes
      if (imageBlob) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [imageBlob]);

  const fileUrl = imageBlob ? URL.createObjectURL(imageBlob) : '';

  return (
    <div className="flex max-h-screen max-w-full flex-col items-center justify-center text-white">
      <div className="relative max-h-screen max-w-full">
        <img src={fileUrl} className="relative max-h-screen object-contain" draggable={false} />
      </div>
    </div>
  );
};

export default FileImageViewer;
