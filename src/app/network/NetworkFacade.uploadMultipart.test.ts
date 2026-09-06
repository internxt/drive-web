import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NetworkFacade } from './NetworkFacade';
import { Network as NetworkModule } from '@internxt/sdk';
import { uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import type { SymmetricCryptoAlgorithm } from '@internxt/sdk/dist/network/types';
import { encryptStreamInParts } from './crypto';
import { uploadFileUint8Array } from './upload-utils';

vi.mock('@internxt/sdk/dist/network/upload', () => ({
  uploadFile: vi.fn(),
  uploadMultipartFile: vi.fn(),
}));
vi.mock('./crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./crypto')>()),
  encryptStreamInParts: vi.fn(),
}));
vi.mock('./upload-utils', () => ({
  uploadFileUint8Array: vi.fn(),
}));

const PART_CONCURRENCY = 6;
const OUTCOME_TIMEOUT_MS = 2000;

type UploadOutcome = 'resolved' | `rejected: ${string}` | 'still pending';

type PendingPartUpload = {
  succeed: () => void;
  fail: (error: Error) => void;
};

/**
 * Stands in for the storage host. Every part PUT stays pending until the test decides its outcome,
 * and fails on its own when the upload aborts it, like the real request does.
 */
class FakeStorageHost {
  private readonly pendingParts = new Map<string, PendingPartUpload>();

  readonly put = (_content: Uint8Array, url: string, options: { abortController?: AbortController }) =>
    new Promise<{ etag: string }>((resolve, reject) => {
      const failAsAborted = () => reject(new Error('Upload aborted'));
      const isAlreadyAborted = options.abortController?.signal.aborted ?? false;
      if (isAlreadyAborted) return failAsAborted();

      options.abortController?.signal.addEventListener('abort', failAsAborted);
      this.pendingParts.set(url, { succeed: () => resolve({ etag: `etag-${url}` }), fail: reject });
    });

  async waitForPart(index: number): Promise<PendingPartUpload> {
    const url = urlForPart(index);
    await vi.waitFor(() => expect(this.pendingParts.has(url)).toBe(true));
    return this.pendingParts.get(url) as PendingPartUpload;
  }

  async waitForPartsInFlight(count: number): Promise<void> {
    await vi.waitFor(() => expect(uploadFileUint8Array).toHaveBeenCalledTimes(count));
    await settleMicrotasks();
  }
}

const urlForPart = (index: number): string => `part-${index}`;

const settleMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

const stubSdkMultipartUpload = (onAbortSignal: (signal?: AbortSignal) => void): void => {
  vi.mocked(uploadMultipartFile).mockImplementation(
    async (_network, _crypto, _bucketId, _mnemonic, _fileSize, encryptFile, uploadParts, signal, totalParts = 0) => {
      onAbortSignal(signal);
      await encryptFile('AES256CTR' as SymmetricCryptoAlgorithm, Buffer.alloc(32), Buffer.alloc(16));

      const presignedUrls = Array.from({ length: totalParts }, (_, index) => urlForPart(index));
      const { parts: uploadedParts } = await uploadParts(presignedUrls);

      return `file-id-with-${uploadedParts.length}-parts`;
    },
  );
};

const stubEncryptedParts = (totalParts: number): void => {
  vi.mocked(encryptStreamInParts).mockImplementation(
    () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (let index = 0; index < totalParts; index++) controller.enqueue(new Uint8Array([index]));
          controller.close();
        },
      }),
  );
};

const observeOutcome = (upload: Promise<string>): Promise<UploadOutcome> =>
  Promise.race([
    upload.then(
      (): UploadOutcome => 'resolved',
      (error: Error): UploadOutcome => `rejected: ${error.message}`,
    ),
    new Promise<UploadOutcome>((resolve) => setTimeout(() => resolve('still pending'), OUTCOME_TIMEOUT_MS)),
  ]);

describe('NetworkFacade.uploadMultipart', () => {
  let facade: NetworkFacade;
  let storageHost: FakeStorageHost;
  let userAbortController: AbortController;
  let sdkAbortSignal: AbortSignal | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    facade = new NetworkFacade({} as NetworkModule.Network);
    storageHost = new FakeStorageHost();
    userAbortController = new AbortController();
    sdkAbortSignal = undefined;

    vi.mocked(uploadFileUint8Array).mockImplementation(storageHost.put);
    stubSdkMultipartUpload((signal) => (sdkAbortSignal = signal));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const startUploadWithParts = (totalParts: number): Promise<string> => {
    stubEncryptedParts(totalParts);
    const file = new File([new Uint8Array(totalParts)], 'big-video.mp4');

    return facade.uploadMultipart('bucket', 'mnemonic', file, {
      uploadingCallback: () => undefined,
      abortController: userAbortController,
      parts: totalParts,
    });
  };

  test('when every part succeeds, then the upload resolves with the file id', async () => {
    const totalParts = 10;
    const upload = startUploadWithParts(totalParts);

    for (let index = 0; index < totalParts; index++) {
      const part = await storageHost.waitForPart(index);
      part.succeed();
    }

    await expect(upload).resolves.toBe('file-id-with-10-parts');
  });

  test('when a part fails while other parts are in flight, then the upload rejects with that error, aborts the rest and requests no more parts', async () => {
    const upload = startUploadWithParts(10);
    await storageHost.waitForPartsInFlight(PART_CONCURRENCY);

    const failingPart = await storageHost.waitForPart(2);
    failingPart.fail(new Error('Unknown error'));

    expect(await observeOutcome(upload)).toBe('rejected: Unknown error');
    expect(sdkAbortSignal?.aborted).toBe(true);
    expect(uploadFileUint8Array).toHaveBeenCalledTimes(PART_CONCURRENCY);
  });

  test('when the last part fails after every other part succeeded, then the upload rejects instead of finishing', async () => {
    const upload = startUploadWithParts(3);

    (await storageHost.waitForPart(0)).succeed();
    (await storageHost.waitForPart(1)).succeed();
    (await storageHost.waitForPart(2)).fail(new Error('Unknown error'));

    expect(await observeOutcome(upload)).toBe('rejected: Unknown error');
  });

  test('when the user cancels, then the upload rejects as cancelled', async () => {
    const upload = startUploadWithParts(10);
    await storageHost.waitForPartsInFlight(PART_CONCURRENCY);

    userAbortController.abort();

    expect(await observeOutcome(upload)).toBe('rejected: Upload cancelled by user');
  });
});
