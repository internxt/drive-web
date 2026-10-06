import { decodeImagePreview, DecodedImagePreview, PREVIEW_KIND } from './decodeImagePreview';

export interface ImagePreviewWorkerRequest {
  buffer: ArrayBuffer;
  extension: string;
}

export type ImagePreviewWorkerResponse = { decoded: DecodedImagePreview | null } | { error: string };

const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

const workerScope = self as unknown as {
  postMessage: (message: ImagePreviewWorkerResponse, transfer?: Transferable[]) => void;
};

self.addEventListener('message', ({ data }: MessageEvent<ImagePreviewWorkerRequest>) => {
  try {
    const decoded = decodeImagePreview(data.buffer, data.extension);
    const pixels = decoded?.kind === PREVIEW_KIND.jpeg ? decoded.bytes : decoded?.data;

    workerScope.postMessage({ decoded }, pixels ? [pixels.buffer] : []);
  } catch (error) {
    workerScope.postMessage({ error: (error as Error)?.message ?? UNKNOWN_ERROR_MESSAGE });
  }
});
