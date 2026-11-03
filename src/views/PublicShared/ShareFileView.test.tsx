import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { match } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import {
  type DownloadSupport,
  downloadToFs,
  getDownloadSupport,
} from 'app/drive/services/download.service/downloadFile';
import network from 'app/network';
import { IDownloadParams } from 'app/network/download';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import shareService from 'app/share/services/share.service';
import errorService from 'services/error.service';
import ShareFileView from './ShareFileView';

vi.mock('react-device-detect', () => ({ isFirefox: true }));

vi.mock('app/drive/services/download.service/downloadFile', () => ({
  default: vi.fn(),
  downloadToFs: vi.fn(),
  getDownloadSupport: vi.fn(),
}));

vi.mock('app/network', () => ({
  default: { downloadFile: vi.fn(), multipartDownloadFile: vi.fn() },
}));

vi.mock('app/store/hooks', () => ({
  useAppSelector: vi.fn().mockReturnValue(false),
  useAppDispatch: vi.fn(),
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const FILE_SIZE = 1000;
const DOWNLOAD_SUPPORT = 'StreamApi' as DownloadSupport;
const SHARING_ID = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';

const sharingMeta = {
  encryptionKey: 'abcd',
  itemToken: 'item-token',
  item: { plainName: 'report', type: 'pdf', size: FILE_SIZE, bucket: 'bucket-id', fileId: 'file-id' },
} as unknown as SharingMeta;

const routeMatch = {
  params: { token: 'f32a91dac7994e13aa178c4d9e0323c9', code: 'code' },
} as unknown as match<{ token: string; code: string }>;

const renderLoadedView = async () => {
  const view = render(<ShareFileView match={routeMatch} token={SHARING_ID} />);
  await waitFor(() => expect(view.getByText('actions.download')).toBeInTheDocument());
  return view;
};

describe('Public shared file download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDownloadSupport).mockResolvedValue(DOWNLOAD_SUPPORT);
    vi.spyOn(shareService, 'getPublicSharingMeta').mockResolvedValue(sharingMeta);
    vi.spyOn(notificationsService, 'show').mockImplementation(() => 'toast-id');
    vi.spyOn(errorService, 'reportError').mockImplementation(() => undefined);
    vi.mocked(network.downloadFile).mockImplementation((params: IDownloadParams) => {
      params.options?.notifyProgress(FILE_SIZE, FILE_SIZE);
      return Promise.resolve(new ReadableStream<Uint8Array>());
    });
  });

  test('when every byte has been read, then the file is shown as downloaded only once it is saved to disk', async () => {
    let finishSaving!: () => void;
    vi.mocked(downloadToFs).mockImplementation(async (_name, source) => {
      await source;
      return new Promise<void>((resolve) => (finishSaving = resolve));
    });
    const { getByText, queryByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));
    await waitFor(() => expect(getByText('99%')).toBeInTheDocument());
    const wasDownloadedBeforeSaving = queryByText('actions.downloaded') !== null;
    await act(async () => finishSaving());

    expect(wasDownloadedBeforeSaving).toBe(false);
    expect(getByText('actions.downloaded')).toBeInTheDocument();
  });

  test('when the download stream fails midway, then an error is shown and the user can download again', async () => {
    vi.mocked(downloadToFs).mockImplementation(async (_name, source) => {
      await source;
      throw new Error('network error');
    });
    const { getByText, queryByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));

    await waitFor(() =>
      expect(notificationsService.show).toHaveBeenCalledWith({ text: 'error.downloadingFile', type: ToastType.Error }),
    );
    expect(getByText('actions.download')).toBeInTheDocument();
    expect(queryByText('actions.downloaded')).not.toBeInTheDocument();
  });

  test('when the user is on Firefox, then the file is still streamed to disk instead of being forced into memory', async () => {
    vi.mocked(downloadToFs).mockResolvedValue(undefined);
    const { getByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));

    await waitFor(() =>
      expect(downloadToFs).toHaveBeenCalledWith(expect.any(String), expect.any(Promise), DOWNLOAD_SUPPORT),
    );
  });
});
