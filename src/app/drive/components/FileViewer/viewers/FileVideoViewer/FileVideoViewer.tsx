import { useEffect, useRef } from 'react';
import { DriveFileData } from 'app/drive/types';
import { getVideoMimeType, localStorageService } from 'services';
import { VideoStreamingService } from 'app/drive/services/video-streaming.service';
import { useVideoChunkDownloader } from 'app/drive/hooks/useVideoChunkDownloader';

const FileVideoViewer = ({
  file,
  setIsPreviewAvailable,
}: {
  file: DriveFileData;
  setIsPreviewAvailable: (isError: boolean) => void;
}): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const user = localStorageService.getUser();
  const mnemonic = user?.mnemonic ?? '';
  const credentials = {
    user: user?.bridgeUser ?? '',
    pass: user?.userId ?? '',
  };

  const { handleChunkRequest } = useVideoChunkDownloader({
    bucketId: file.bucket,
    fileId: file.fileId,
    mnemonic,
    credentials,
  });

  useEffect(() => {
    if (!credentials.user || !credentials.pass || !mnemonic) {
      console.error('[FileVideoViewer] Missing credentials');
      return;
    }

    const service = new VideoStreamingService(
      {
        fileSize: file.size,
        mimeType: getVideoMimeType(file.type),
      },
      handleChunkRequest,
    );

    service
      .init()
      .then(() => {
        if (videoRef.current) {
          videoRef.current.src = service.getVideoUrl();
          videoRef.current.load();
        }
      })
      .catch((error) => {
        console.error('[FileVideoViewer] Error:', error);
        setIsPreviewAvailable(false);
      });

    return () => {
      service.destroy();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
      }
    };
  }, [
    file.fileId,
    file.bucket,
    file.size,
    file.type,
    handleChunkRequest,
    credentials.user,
    credentials.pass,
    mnemonic,
    setIsPreviewAvailable,
  ]);

  const handleError = (event: Event, video: HTMLVideoElement) => {
    console.error('[FileVideoViewer] Video error:', event);
    const error = video.error;
    if (error) {
      console.error('[FileVideoViewer] Error code:', error.code, 'message:', error.message);
    }
    setIsPreviewAvailable(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('error', (event) => handleError(event, video));

    return () => {
      video.removeEventListener('error', (event) => handleError(event, video));
    };
  }, [setIsPreviewAvailable]);

  return (
    <video ref={videoRef} controls autoPlay style={{ width: '100%', maxHeight: '80vh', backgroundColor: '#000' }}>
      <track kind="captions" />
    </video>
  );
};

export default FileVideoViewer;
