import { useEffect, useRef, useState } from 'react';
import { localStorageService } from 'services';
import { VideoStreamingSession } from 'app/drive/services/video-streaming.service/VideoStreamingSession';
import { FormatFileViewerProps } from '../../FileViewer';
import { generateThumbnailBlob } from 'app/drive/services/thumbnail.service';

const PROGRESS_INCREMENT = 0.2;
const PROGRESS_INTERVAL_MS = 500;
const MAX_SIMULATED_PROGRESS = 0.95;
const VIDEO_READY_STATE_FOR_FRAME = 2;

const FileVideoViewer = ({
  file,
  blob,
  disableVideoStream,
  setIsPreviewAvailable,
  handlersForSpecialItems,
}: FormatFileViewerProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<VideoStreamingSession | null>(null);
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

  // Handle shared items
  useEffect(() => {
    if (!disableVideoStream || !videoRef.current || !blob) return;

    const blobUrl = URL.createObjectURL(blob);
    videoRef.current.src = blobUrl;
    videoRef.current.load();

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [disableVideoStream, blob]);

  // Handle streaming playback
  useEffect(() => {
    if (disableVideoStream) return;

    const user = localStorageService.getUser();
    const mnemonic = user?.mnemonic ?? '';
    const bridgeUser = user?.bridgeUser ?? '';
    const userId = user?.userId ?? '';

    if (!bridgeUser || !userId || !mnemonic) {
      console.error('[FileVideoViewer] Missing credentials');
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

    sessionRef.current = session;

    session
      .init()
      .then((success) => {
        // If init returned false, session was destroyed during init - just ignore
        if (!success) return;

        const url = session.getVideoUrl();
        if (videoRef.current && url) {
          videoRef.current.src = url;
          videoRef.current.load();
        }
      })
      .catch((error) => {
        console.error('[FileVideoViewer] Error initializing session:', error);
        setIsPreviewAvailable(false);
      });

    return () => {
      session.destroy();
      sessionRef.current = null;
      setCanPlay(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
      }
    };
  }, [file.fileId, file.bucket, file.size, file.type, disableVideoStream, setIsPreviewAvailable]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (event: Event) => {
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

      const video = videoRef.current;
      if (video && video.readyState >= VIDEO_READY_STATE_FOR_FRAME) {
        generateThumbnailBlob(video, async (blob) => {
          if (!blob) return;
          await handlersForSpecialItems?.handleUpdateThumbnail(file, blob);
        });
      }
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [setIsPreviewAvailable, handlersForSpecialItems, file]);

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
};

export default FileVideoViewer;
