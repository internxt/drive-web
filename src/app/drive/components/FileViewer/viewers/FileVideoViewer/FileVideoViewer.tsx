import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getVideoMimeType, localStorageService } from 'services';
import { VideoStreamingService } from 'app/drive/services/video-streaming.service';
import { useVideoChunkDownloader } from 'app/drive/hooks/useVideoChunkDownloader';
import { FormatFileViewerProps } from '../../FileViewer';

const FileVideoViewer = ({
  file,
  setIsPreviewAvailable,
  handlersForSpecialItems,
}: FormatFileViewerProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canPlay, setCanPlay] = useState(false);

  const user = localStorageService.getUser();
  const mnemonic = user?.mnemonic ?? '';
  const bridgeUser = user?.bridgeUser ?? '';
  const userId = user?.userId ?? '';

  const credentials = useMemo(
    () => ({
      user: bridgeUser,
      pass: userId,
    }),
    [bridgeUser, userId],
  );

  const handleProgress = useCallback(
    (progress: number) => {
      handlersForSpecialItems?.handleUpdateProgress(progress);
    },
    [handlersForSpecialItems?.handleUpdateProgress],
  );

  const { handleChunkRequest } = useVideoChunkDownloader({
    bucketId: file.bucket,
    fileId: file.fileId,
    mnemonic,
    credentials,
    handleProgress,
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
      onUnmountComponent(service, videoRef.current);
    };
  }, [file.fileId, file.bucket, file.size, file.type, handleChunkRequest, mnemonic, setIsPreviewAvailable]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('error', (event) => handleError(event, video));
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('error', (event) => handleError(event, video));
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const onUnmountComponent = (service: VideoStreamingService, currentVideoRef: HTMLVideoElement | null) => {
    service.destroy().catch((error) => {
      console.error('[FileVideoViewer] Error destroying service:', error);
    });
    setCanPlay(false);
    if (currentVideoRef) {
      currentVideoRef.pause();
      currentVideoRef.removeAttribute('src');
    }
  };

  const handleError = (event: Event, video: HTMLVideoElement) => {
    console.error('[FileVideoViewer] Video error:', event);
    const error = video.error;
    if (error) {
      console.error('[FileVideoViewer] Error code:', error.code, 'message:', error.message);
    }
    setIsPreviewAvailable(false);
  };

  const handleCanPlay = () => {
    handlersForSpecialItems?.handleUpdateProgress(1);
    setCanPlay(true);
  };

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      style={{ width: '100%', maxHeight: '80vh', backgroundColor: '#000' }}
      className={canPlay ? 'flex' : 'hidden'}
    >
      <track kind="captions" />
    </video>
  );
};

export default FileVideoViewer;
