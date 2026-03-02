import { useEffect, useRef, useState } from 'react';
import { localStorageService } from 'services';
import { FormatFileViewerProps } from '../../FileViewer';
import { VideoStreamingSession } from 'app/drive/services/video-streaming.service/VideoStreamingSession';

const PROGRESS_INCREMENT = 0.2;
const PROGRESS_INTERVAL_MS = 500;
const MAX_SIMULATED_PROGRESS = 0.95;

const FileVideoViewer = ({
  file,
  blob,
  disableVideoStream,
  setIsPreviewAvailable,
  handlersForSpecialItems,
}: FormatFileViewerProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  useEffect(() => {
    if (disableVideoStream || canPlay) return;

    progressIntervalRef.current = setInterval(() => {
      setSimulatedProgress((prev) => {
        const next = prev + PROGRESS_INCREMENT;
        if (next >= MAX_SIMULATED_PROGRESS) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return MAX_SIMULATED_PROGRESS;
        }
        return next;
      });
    }, PROGRESS_INTERVAL_MS);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [disableVideoStream, canPlay]);

  useEffect(() => {
    if (!disableVideoStream && !canPlay && simulatedProgress > 0) {
      handlersForSpecialItems?.handleUpdateProgress(simulatedProgress);
    }
  }, [simulatedProgress, canPlay, disableVideoStream, handlersForSpecialItems]);

  useEffect(() => {
    if (!disableVideoStream || !videoRef.current || !blob) return;

    const blobUrl = URL.createObjectURL(blob);
    videoRef.current.src = blobUrl;
    videoRef.current.load();

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [disableVideoStream, blob]);

  useEffect(() => {
    if (disableVideoStream || !containerRef.current) return;

    const user = localStorageService.getUser();
    const mnemonic = user?.mnemonic ?? '';
    const bridgeUser = user?.bridgeUser ?? '';
    const userId = user?.userId ?? '';

    if (!bridgeUser || !userId || !mnemonic) {
      console.error('[FileVideoViewer] Missing credentials');
      handleOnError('Missing credentials');
      return;
    }

    if (!file.fileId) {
      console.error('[FileVideoViewer] Missing fileId');
      handleOnError('Missing fileId');
      return;
    }

    const session = new VideoStreamingSession({
      fileId: file.fileId,
      bucketId: file.bucket,
      fileSize: file.size,
      fileType: file.type,
      mnemonic: file.mnemonic ?? mnemonic,
      credentials: file.credentials
        ? { user: file.credentials?.user, pass: file.credentials?.pass }
        : { user: bridgeUser, pass: userId },
    });

    session.init(containerRef.current, handleOnReady, handleOnError);

    return () => {
      session.destroy();
      setCanPlay(false);
    };
  }, [file.fileId, file.bucket, file.size, file.type, disableVideoStream]);

  const handleOnReady = () => {
    handlersForSpecialItems?.handleUpdateProgress(1);
    setCanPlay(true);
    setIsPreviewAvailable(true);
  };

  const handleOnError = (errorMessage?: string) => {
    console.error(`[FileVideoViewer] Video error: ${errorMessage}`);
    setIsPreviewAvailable(false);
  };

  const handleVideoErrorEvent = (event: Event) => {
    const errorMessage = (event.target as HTMLVideoElement)?.error?.message;
    handleOnError(errorMessage);
  };

  useEffect(() => {
    if (!disableVideoStream) return;
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('error', handleVideoErrorEvent);
    video.addEventListener('canplay', handleOnReady);

    return () => {
      video.removeEventListener('error', handleVideoErrorEvent);
      video.removeEventListener('canplay', handleOnReady);
    };
  }, [disableVideoStream]);

  // Blob
  if (disableVideoStream) {
    return (
      <video
        ref={videoRef}
        controls
        autoPlay
        preload="metadata"
        style={{ width: '100%', maxHeight: '80vh', backgroundColor: '#000' }}
        className={canPlay ? 'flex' : 'hidden'}
      >
        <track kind="captions" />
      </video>
    );
  }

  // Stream
  return <div ref={containerRef} className={canPlay ? 'flex items-center justify-center' : 'hidden'} />;
};

export default FileVideoViewer;
