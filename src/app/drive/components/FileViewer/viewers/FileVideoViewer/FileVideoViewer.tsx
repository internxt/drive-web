import { useEffect, useRef } from 'react';
import { VideoSWBridge, ChunkRequestPayload } from './VideoSWBridge';
import { downloadChunkFile } from 'app/network/download/v2';
import { DriveFileData } from 'app/drive/types';
import { localStorageService } from 'services';
import { NetworkCredentials } from 'app/network/download';

export default function FileVideoViewer({ file }: { file: DriveFileData }) {
  const { fileId, size: fileSize, bucket } = file;
  const user = localStorageService.getUser();
  const mnemonic = user?.mnemonic ?? '';
  const credentials: NetworkCredentials = {
    user: user?.bridgeUser ?? '',
    pass: user?.userId ?? '',
  };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bridgeRef = useRef<VideoSWBridge | null>(null);
  const chunkCacheRef = useRef<Map<string, Uint8Array>>(new Map());
  const pendingRequestsRef = useRef<Map<string, Promise<Uint8Array>>>(new Map());

  useEffect(() => {
    if (!credentials || !mnemonic) {
      return;
    }

    // Limpiar caches
    chunkCacheRef.current.clear();
    pendingRequestsRef.current.clear();

    // Limpiar el video anterior
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }

    // Destruir el bridge anterior
    if (bridgeRef.current) {
      bridgeRef.current.destroy();
      bridgeRef.current = null;
    }

    const handleChunkRequest = async (request: ChunkRequestPayload): Promise<Uint8Array> => {
      const { start, end } = request;
      const chunkKey = `${start}-${end}`;

      // 1. Verificar cache
      const cached = chunkCacheRef.current.get(chunkKey);
      if (cached) {
        return cached;
      }

      // 2. Si ya hay una petición en curso, esperar a que termine
      const pending = pendingRequestsRef.current.get(chunkKey);
      if (pending) {
        return pending;
      }

      // 3. Crear nueva petición
      const downloadPromise = (async () => {
        try {
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

          let done = false;
          while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
              chunks.push(result.value);
            }
          }

          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }

          // Guardar en cache
          chunkCacheRef.current.set(chunkKey, result);
          return result;
        } finally {
          // Limpiar petición pendiente
          pendingRequestsRef.current.delete(chunkKey);
        }
      })();

      // Guardar como pendiente
      pendingRequestsRef.current.set(chunkKey, downloadPromise);
      return downloadPromise;
    };

    const bridge = new VideoSWBridge(
      {
        fileId,
        bucketId: bucket,
        fileSize,
      },
      handleChunkRequest,
    );

    bridgeRef.current = bridge;

    bridge
      .init()
      .then(() => {
        const videoUrl = bridge.getVideoUrl();
        console.log('[FileVideoViewer] Setting video URL:', videoUrl, 'for file:', fileId);
        if (videoRef.current) {
          videoRef.current.src = videoUrl;
          videoRef.current.load(); // Force reload
        }
      })
      .catch((error) => {
        console.error('ERROR WHILE RENDERING VIDEO: ', error);
      });

    return () => {
      console.log('[FileVideoViewer] Cleanup for file:', fileId);
      if (bridgeRef.current) {
        bridgeRef.current.destroy();
        bridgeRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, [file]);

  return <video controls ref={videoRef} style={{ width: '100%', maxHeight: '80vh' }} />;
}
