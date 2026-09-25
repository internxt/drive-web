import { createImagePreviewWebWorker } from '../../../../WebWorker';
import { DecodedImagePreview, PREVIEW_KIND } from './decodeImagePreview';
import { ImagePreviewWorkerRequest, ImagePreviewWorkerResponse } from './imagePreview.worker';
import { RgbaImage } from './tiffDecoder';

const JPEG_QUALITY = 0.92;
const JPEG_MIME_TYPE = 'image/jpeg';
const CANVAS_CONTEXT_2D = '2d';

const rgbaToJpegBlob = ({ width, height, data }: RgbaImage): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext(CANVAS_CONTEXT_2D)
    ?.putImageData(new ImageData(new Uint8ClampedArray(data.buffer), width, height), 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the preview'))),
      JPEG_MIME_TYPE,
      JPEG_QUALITY,
    );
  });
};

/** Decodes in a Worker so multi-megapixel TIFF/RAW decoding never blocks the UI. */
const decodeInWorker = (request: ImagePreviewWorkerRequest): Promise<DecodedImagePreview | null> =>
  new Promise((resolve, reject) => {
    const worker = createImagePreviewWebWorker();

    worker.onmessage = ({ data }: MessageEvent<ImagePreviewWorkerResponse>) => {
      worker.terminate();
      if ('error' in data) reject(new Error(data.error));
      else resolve(data.decoded);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };

    worker.postMessage(request, [request.buffer]);
  });

/**
 * Converts a TIFF or camera RAW blob into a JPEG blob the browser can render.
 * The original blob is never modified. Throws when the file holds nothing displayable.
 */
export const convertImageForPreview = async (blob: Blob, extension: string): Promise<Blob> => {
  const decoded = await decodeInWorker({ buffer: await blob.arrayBuffer(), extension });
  if (!decoded) throw new Error(`No preview available for ${extension} files`);

  return decoded.kind === PREVIEW_KIND.jpeg
    ? new Blob([decoded.bytes], { type: JPEG_MIME_TYPE })
    : rgbaToJpegBlob(decoded);
};
