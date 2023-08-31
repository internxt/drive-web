import { useEffect, useRef, useState } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

const FileVideoViewer = ({
  blob,
  setIsPreviewAvailable,
}: {
  blob: Blob;
  setIsPreviewAvailable: (isPreviewAvailable: boolean) => void;
}): JSX.Element => {
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Get the dimensions of the video.
  useEffect(() => {
    const videoPlayer = videoPlayerRef.current as HTMLVideoElement;

    videoPlayer.addEventListener('loadedmetadata', () => {
      const { videoWidth, videoHeight } = videoPlayer;
      setDimensions({ width: videoWidth, height: videoHeight });
    });

    videoPlayer.src = URL.createObjectURL(blob);

    videoPlayer.play().catch((err) => {
      const error = err as Error;
      console.error('[ERROR WHILE PLAYING VIDEO/STACK]: ', error.stack || error.message);
      setIsPreviewAvailable(false);
    });

    // Cleanup.
    return () => {
      URL.revokeObjectURL(videoPlayer.src);
    };
  }, []);

  return (
    <div className={'flex h-full w-full flex-col items-center justify-center'}>
      <video
        ref={videoPlayerRef}
        controls
        className={`${dimensions.width > dimensions.height ? 'w-full' : 'h-full'}`}
        style={{
          aspectRatio: `${dimensions.width}/${dimensions.height}`,
        }}
      ></video>
    </div>
  );
};

export default FileVideoViewer;
