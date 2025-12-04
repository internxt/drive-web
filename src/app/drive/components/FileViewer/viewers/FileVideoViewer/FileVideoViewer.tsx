import { useEffect, useRef } from 'react';
import { DriveFileData } from 'app/drive/types';
import { getVideoMimeType, localStorageService } from 'services';
import { VideoStreamingService } from 'app/drive/services/video-streaming.service';
import { useVideoChunkDownloader } from 'app/drive/hooks/useVideoChunkDownloader';

export default function FileVideoViewer({
  file,
  setIsPreviewAvailable,
}: {
  file: DriveFileData;
  setIsPreviewAvailable: (isError: boolean) => void;
}) {
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
  ]);

  return (
    <video ref={videoRef} controls playsInline style={{ width: '100%', maxHeight: '80vh', backgroundColor: '#000' }} />
  );
}
