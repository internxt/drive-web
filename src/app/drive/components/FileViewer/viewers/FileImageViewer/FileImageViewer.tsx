import { useEffect, useState } from 'react';
import heic2any from 'heic2any';

import { FormatFileViewerProps } from '../../FileViewer';

import './FileImageViewer.scss';

const FileImageViewer = (props: FormatFileViewerProps): JSX.Element => {
  console.log(props.blob);
  const [imageBlob, setImageBlob] = useState<Blob | null>(props.blob);

  useEffect(() => {
    const convertHeicToAny = async () => {
      try {
        // show a spinner. Yhe file viewer already handles that, it would be a
        // good idea to just inject the loading handler via props and determine
        // when the loading finishes in each specific viewer
        if (props.file.type === 'heic') {
          console.log('is a heic');
          const convertedBlob = await heic2any({ blob: props.blob });
          setImageBlob(convertedBlob as Blob);
        } else {
          setImageBlob(props.blob);
        }
        // hide the spinner
      } catch (error) {
        console.error('Error converting HEIC to another format:', error);
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
