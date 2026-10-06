import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile } from './upload';
import { ConnectionLostError } from './requests';
import { Network } from '@internxt/sdk/dist/network';
import packageJson from '../../../package.json';

const uploadMock = vi.hoisted(() => vi.fn());

const uploadParams = {
  filesize: 50000,
  filecontent: new File(['content'], 'file.txt'),
  creds: { user: 'user', pass: 'password' },
  mnemonic: 'mnemonic123',
  progressCallback: vi.fn(),
};

vi.mock('./NetworkFacade', () => ({
  NetworkFacade: vi.fn().mockImplementation(function () {
    return {
      uploadMultipart: vi.fn().mockResolvedValue('multipart-upload-success'),
      upload: uploadMock,
    };
  }),
}));

describe('uploadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully upload a file', async () => {
    uploadMock.mockResolvedValue('upload-success');

    const result = await uploadFile('bucket123', uploadParams);

    expect(uploadMock).toBeCalledTimes(1);
    expect(result).toBe('upload-success');
  });

  it('should create the network client with the app version from package.json', async () => {
    uploadMock.mockResolvedValue('upload-success');
    const networkClientSpy = vi.spyOn(Network, 'client');

    await uploadFile('bucket123', uploadParams);

    const [, appDetails] = networkClientSpy.mock.calls[0];
    expect(appDetails).toStrictEqual({ clientName: 'drive-web', clientVersion: packageJson.version });
  });

  it('should retry upload on failure and succeed on second attempt', async () => {
    uploadMock.mockRejectedValueOnce(new Error('Temporary error')).mockResolvedValue('upload-success');

    const result = await uploadFile('bucket123', uploadParams);

    expect(uploadMock).toBeCalledTimes(2);
    expect(result).toBe('upload-success');
  });

  it('should throw ConnectionLostError if connection is lost', async () => {
    uploadMock.mockRejectedValue(new ConnectionLostError());

    await expect(uploadFile('bucket123', uploadParams)).rejects.toThrow(ConnectionLostError);
  });

  it('should throw an error after max retries', async () => {
    uploadMock
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockRejectedValueOnce(new Error('Temporary error'));

    await expect(uploadFile('bucket123', uploadParams)).rejects.toThrow('Temporary error');
    expect(uploadMock).toBeCalledTimes(3);
  });
});
