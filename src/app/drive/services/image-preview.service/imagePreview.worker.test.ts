import { buildTiff } from 'testUtils/imageBuilders';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { PREVIEW_KIND } from './decodeImagePreview';
import { ImagePreviewWorkerResponse } from './imagePreview.worker';
import './imagePreview.worker';

const IMAGE_SIZE = { width: 16, height: 8 };

const sendToWorker = (buffer: ArrayBuffer, extension: string) =>
  self.dispatchEvent(new MessageEvent('message', { data: { buffer, extension } }));

const getRgbaReply = (response: ImagePreviewWorkerResponse) =>
  'decoded' in response && response.decoded?.kind === PREVIEW_KIND.rgba ? response.decoded : null;

describe('imagePreview.worker', () => {
  afterEach(() => vi.restoreAllMocks());

  test('when a TIFF is posted to the worker, then it replies with the decoded pixels and transfers their buffer', () => {
    const postMessage = vi.spyOn(self, 'postMessage').mockImplementation(() => undefined);

    sendToWorker(buildTiff([IMAGE_SIZE]), 'tif');

    const [response, transfer] = postMessage.mock.calls[0] as [ImagePreviewWorkerResponse, Transferable[]];
    const decoded = getRgbaReply(response);
    expect(decoded).toMatchObject(IMAGE_SIZE);
    expect(transfer).toEqual([decoded?.data.buffer]);
  });
});
