/* eslint-disable no-constant-condition */
import { useEffect, useRef } from 'react';
import { downloadChunkFile } from 'app/network/download/v2';
import { DriveFileData } from 'app/drive/types';
import { getVideoMimeType, localStorageService } from 'services';
import { NetworkCredentials } from 'app/network/download';
import { ChunkRequestPayload, VideoStreamingService } from 'app/drive/services/video-streaming.service';

export default function FileVideoViewer({ file }: { file: DriveFileData }) {
  const { fileId, size: fileSize, bucket } = file;
  const user = localStorageService.getUser();
  const mnemonic = user?.mnemonic ?? '';
  const credentials: NetworkCredentials = {
    user: user?.bridgeUser ?? '',
    pass: user?.userId ?? '',
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bridgeRef = useRef<VideoStreamingService | null>(null);
  const chunkCacheRef = useRef<Map<string, Uint8Array>>(new Map());
  const pendingRequestsRef = useRef<Map<string, Promise<Uint8Array>>>(new Map());
  const currentFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!credentials.user || !credentials.pass || !mnemonic) {
      console.error('[FileVideoViewer] Missing credentials or mnemonic');
      return;
    }

    currentFileIdRef.current = fileId;

    console.log('[FileVideoViewer] Initializing for file:', fileId);

    chunkCacheRef.current.clear();
    pendingRequestsRef.current.clear();

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    if (bridgeRef.current) {
      bridgeRef.current.destroy();
      bridgeRef.current = null;
    }

    const handleChunkRequest = async (request: ChunkRequestPayload): Promise<Uint8Array> => {
      if (currentFileIdRef.current !== fileId) {
        throw new Error('File changed during chunk request');
      }

      const { start, end } = request;
      const chunkKey = `${fileId}-${start}-${end}`;

      console.log(`[FileVideoViewer] Chunk request: ${start}-${end}`);

      const cached = chunkCacheRef.current.get(chunkKey);
      if (cached) {
        console.log(`[FileVideoViewer] Cache hit: ${chunkKey}`);
        return cached;
      }

      const pending = pendingRequestsRef.current.get(chunkKey);
      if (pending) {
        console.log(`[FileVideoViewer] Waiting for pending: ${chunkKey}`);
        return pending;
      }

      const downloadPromise = (async () => {
        try {
          if (currentFileIdRef.current !== fileId) {
            throw new Error('File changed before download');
          }

          console.log(`[FileVideoViewer] Downloading chunk: ${start}-${end}`);

          const stream = await downloadChunkFile({
            bucketId: bucket,
            fileId,
            mnemonic,
            creds: credentials,
            chunkStart: start,
            chunkEnd: end,
            options: {
              notifyProgress: () => {},
            },
          });

          const reader = stream.getReader();
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }

          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }

          console.log(`[FileVideoViewer] Downloaded: ${start}-${end}, size: ${result.length}`);

          if (currentFileIdRef.current === fileId) {
            if (chunkCacheRef.current.size > 20) {
              const firstKey = chunkCacheRef.current.keys().next().value;
              if (firstKey) chunkCacheRef.current.delete(firstKey);
            }
            chunkCacheRef.current.set(chunkKey, result);
          }

          return result;
        } finally {
          pendingRequestsRef.current.delete(chunkKey);
        }
      })();

      pendingRequestsRef.current.set(chunkKey, downloadPromise);
      return downloadPromise;
    };

    const bridge = new VideoStreamingService(
      {
        fileSize,
        mimeType: getVideoMimeType(file.type),
      },
      handleChunkRequest,
    );

    bridgeRef.current = bridge;

    bridge
      .init()
      .then(() => {
        if (currentFileIdRef.current !== fileId) {
          console.log('[FileVideoViewer] File changed during init, aborting');
          bridge.destroy();
          return;
        }

        const videoUrl = bridge.getVideoUrl();
        console.log('[FileVideoViewer] Video URL:', videoUrl);

        if (videoRef.current) {
          videoRef.current.src = videoUrl;
          videoRef.current.load();
        }
      })
      .catch((error) => {
        if (currentFileIdRef.current === fileId) {
          console.error('[FileVideoViewer] Error:', error);
        }
      });

    return () => {
      console.log('[FileVideoViewer] Cleanup for file:', fileId);
      currentFileIdRef.current = null;

      if (bridgeRef.current) {
        bridgeRef.current.destroy();
        bridgeRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }

      chunkCacheRef.current.clear();
      pendingRequestsRef.current.clear();
    };
  }, [fileId, bucket, fileSize, mnemonic, credentials.user, credentials.pass]);

  return (
    <video ref={videoRef} controls playsInline style={{ width: '100%', maxHeight: '80vh', backgroundColor: '#000' }} />
  );
}
