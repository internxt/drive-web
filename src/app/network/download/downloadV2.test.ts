import { describe, test, expect, vi, beforeEach } from 'vitest';
import { DownloadV2, DownloadOwnFileParams } from './v2';
import { UnknownDownloadError } from '../errors/download.errors';
import { MultipartDownload } from './MultipartDownload';
import * as cryptoUtils from '../../crypto/services/utils';
import envService from 'app/core/services/env.service';

vi.mock('../../crypto/services/utils');
vi.mock('app/core/services/env.service');
vi.mock('@internxt/sdk/dist/network', () => ({
  Network: {
    client: vi.fn(),
  },
}));

import { Network } from '@internxt/sdk/dist/network';

describe('Download V2', () => {
  let downloadV2Instance: DownloadV2;

  beforeEach(() => {
    vi.clearAllMocks();
    downloadV2Instance = new DownloadV2();

    vi.mocked(Network.client).mockReturnValue({} as any);
    vi.spyOn(envService, 'getVariable').mockReturnValue('https://bridge.internxt.com');
    vi.mocked(cryptoUtils.getSha256).mockResolvedValue('hashed-password');
  });

  describe('Multipart download', () => {
    test('When multipart download is called, then the correct function is called', async () => {
      const params = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        creds: { user: 'test-user', pass: 'test-pass' },
        mnemonic: 'test mnemonic words',
        fileSize: 1024,
        options: {
          notifyProgress: vi.fn(),
          abortController: new AbortController(),
        },
      };

      const mockStream = new ReadableStream<Uint8Array>();
      const multipartDownloadSpy = vi.spyOn(MultipartDownload.prototype, 'downloadFile').mockResolvedValue(mockStream);

      await downloadV2Instance.multipartDownload(params);

      expect(multipartDownloadSpy).toHaveBeenCalledWith({
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test mnemonic words',
        fileSize: 1024,
        options: {
          downloadingCallback: params.options.notifyProgress,
          abortController: params.options.abortController,
        },
      });
    });

    test('When multipart download is called, then it returns the readable stream', async () => {
      const params = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        creds: { user: 'test-user', pass: 'test-pass' },
        mnemonic: 'test mnemonic words',
        fileSize: 1024,
        options: {
          notifyProgress: vi.fn(),
        },
      };

      const mockStream = new ReadableStream<Uint8Array>();
      vi.spyOn(MultipartDownload.prototype, 'downloadFile').mockResolvedValue(mockStream);

      const result = await downloadV2Instance.multipartDownload(params);

      expect(result).toStrictEqual(mockStream);
    });
  });

  describe('Download File', () => {
    test('When params have token and  an encryption key, then the user downloads a shared file', () => {
      const params = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        token: 'test-token',
        encryptionKey: '0'.repeat(64),
        fileSize: 1024,
      };

      const downloadSharedFileSpy = vi.spyOn(downloadV2Instance, 'downloadSharedFile');

      downloadV2Instance.downloadFile(params);

      expect(downloadSharedFileSpy).toHaveBeenCalledWith(params);
    });

    test('When params have credentials and mnemonic, then the user downloads his own file', () => {
      const params: DownloadOwnFileParams = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        creds: { user: 'test-user', pass: 'test-pass' },
        mnemonic: 'test mnemonic words',
        fileSize: 1024,
      };

      const downloadOwnFileSpy = vi.spyOn(downloadV2Instance, 'downloadOwnFile');

      downloadV2Instance.downloadFile(params);

      expect(downloadOwnFileSpy).toHaveBeenCalledWith(params);
    });

    test('When params have neither valid auth combination, then an error indicating so is thrown', () => {
      const params = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        fileSize: 1024,
      } as any;

      expect(() => downloadV2Instance.downloadFile(params)).toThrow(UnknownDownloadError);
    });
  });
});
