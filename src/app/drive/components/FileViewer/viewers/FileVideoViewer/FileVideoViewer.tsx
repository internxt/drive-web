import { useEffect, useRef, useState } from 'react';
import { localStorageService } from 'services';
import { VideoStreamingSession } from 'app/drive/services/video-streaming.service/VideoStreamingSession';
import { FormatFileViewerProps } from '../../FileViewer';

const FileVideoViewer = ({
  file,
  blob,
  disableVideoStream,
  setIsPreviewAvailable,
  handlersForSpecialItems,
}: FormatFileViewerProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<VideoStreamingSession | null>(null);
  const [canPlay, setCanPlay] = useState(false);

  // Handle shared items (blob-based playback)
  useEffect(() => {
    if (!disableVideoStream || !videoRef.current || !blob) return;

    const blobUrl = URL.createObjectURL(blob);
    videoRef.current.src = blobUrl;
    videoRef.current.load();

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [disableVideoStream, blob]);

  // Handle streaming playback (non-shared items)
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
      mnemonic,
      credentials: { user: bridgeUser, pass: userId },
      onProgress: (progress) => {
        handlersForSpecialItems?.handleUpdateProgress(progress);
      },
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
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [setIsPreviewAvailable, handlersForSpecialItems]);

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
