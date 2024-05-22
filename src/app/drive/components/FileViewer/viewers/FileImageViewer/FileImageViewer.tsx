import { useEffect, useState } from 'react';
import heic2any from 'heic2any';

import { FormatFileViewerProps } from '../../FileViewer';

import './FileImageViewer.scss';

const FileImageViewer = (props: FormatFileViewerProps): JSX.Element => {
  const [imageBlob, setImageBlob] = useState<Blob | null>();

  useEffect(() => {
    const convertHeicToAny = async () => {
      try {
        if (props.file.type.toLowerCase() === 'heic') {
          props.handleUpdateProgress?.(0.95);
          const convertedBlob = await heic2any({ blob: props.blob });
          setImageBlob(convertedBlob as Blob);
        } else {
          setImageBlob(props.blob);
        }
      } catch (error) {
        console.error('Error converting HEIC to another format:', error);
      } finally {
        props.handleUpdateProgress?.(1);
      }
    };

    convertHeicToAny();
  }, [props.blob]);

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
