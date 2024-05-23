import { useEffect, useState } from 'react';
import heic2any from 'heic2any';

import { FormatFileViewerProps } from '../../FileViewer';

import './FileImageViewer.scss';

const FileImageViewer = ({ file, blob, handlersForSpecialItems }: FormatFileViewerProps): JSX.Element => {
  const [imageBlob, setImageBlob] = useState<Blob | null>();

  useEffect(() => {
    const convertHeicToAny = async () => {
      try {
        if (file.type.toLowerCase() === 'heic') {
          const updatedFile = { ...file };
          handlersForSpecialItems?.handleUpdateProgress(0.95);

          const convertedBlob = await heic2any({ blob: blob });
          updatedFile.type = 'png';

          await handlersForSpecialItems?.handleUpdateThumbnail(updatedFile, convertedBlob as Blob);

          setImageBlob(convertedBlob as Blob);
        } else {
          setImageBlob(blob);
        }
      } catch (error) {
        console.error('Error converting HEIC to another format:', error);
      } finally {
        handlersForSpecialItems?.handleUpdateProgress(1);
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
