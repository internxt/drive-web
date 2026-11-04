import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { match } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { ErrorMessages } from 'app/core/constants';
import { DownloadSupport, downloadToFs, getDownloadSupport } from 'app/drive/services/download.service/downloadFile';
import network from 'app/network';
import { IDownloadParams } from 'app/network/download';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import shareService from 'app/share/services/share.service';
import errorService from 'services/error.service';
import ShareFileView from './ShareFileView';

vi.mock('react-device-detect', () => ({ isFirefox: true }));

vi.mock('app/drive/services/download.service/downloadFile', () => ({
  default: vi.fn(),
  DownloadSupport: { StreamApi: 'StreamApi', PartialStreamApi: 'PartialStreamApi', Blob: 'Blob' },
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
const SHARING_ID = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';

const sharingMeta = {
  encryptionKey: 'abcd',
  itemToken: 'item-token',
  item: { plainName: 'report', type: 'pdf', size: FILE_SIZE, bucket: 'bucket-id', fileId: 'file-id' },
} as unknown as SharingMeta;

const routeMatch = {
  params: { token: 'f32a91dac7994e13aa178c4d9e0323c9', code: 'code' },
} as unknown as match<{ token: string; code: string }>;

const getDownloadAbortController = () => vi.mocked(downloadToFs).mock.calls[0][4];

const renderLoadedView = async () => {
  const view = render(<ShareFileView match={routeMatch} token={SHARING_ID} />);
  await waitFor(() => expect(view.getByText('actions.download')).toBeInTheDocument());
  return view;
};

describe('Public shared file download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDownloadSupport).mockResolvedValue(DownloadSupport.PartialStreamApi);
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

  test.each([
    [
      'the browser supports the save dialog',
      'saved straight to Downloads',
      DownloadSupport.StreamApi,
      DownloadSupport.PartialStreamApi,
    ],
    ['the user is on Firefox', 'streamed to disk', DownloadSupport.PartialStreamApi, DownloadSupport.PartialStreamApi],
    ['the user is on Brave', 'kept in memory as a blob', DownloadSupport.Blob, DownloadSupport.Blob],
  ])('when %s, then the file is %s', async (_scenario, _outcome, detected, expected) => {
    vi.mocked(getDownloadSupport).mockResolvedValue(detected);
    vi.mocked(downloadToFs).mockResolvedValue(undefined);
    const { getByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));

    await waitFor(() =>
      expect(downloadToFs).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Promise),
        expected,
        undefined,
        expect.any(AbortController),
        FILE_SIZE,
      ),
    );
  });

  test('when the file is downloaded, then its size is passed so the browser can show the download progress', async () => {
    vi.mocked(downloadToFs).mockResolvedValue(undefined);
    const { getByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));

    await waitFor(() => expect(vi.mocked(downloadToFs).mock.calls[0][5]).toBe(FILE_SIZE));
  });

  test('when saving the file fails, then the network download is aborted and the error is reported', async () => {
    vi.mocked(downloadToFs).mockRejectedValue(new Error('disk full'));
    const { getByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));

    await waitFor(() => expect(errorService.reportError).toHaveBeenCalled());
    expect(getDownloadAbortController()?.signal.aborted).toBe(true);
    expect(vi.mocked(network.downloadFile).mock.calls[0][0].options?.abortController).toBe(
      getDownloadAbortController(),
    );
  });

  test('when the download is cancelled from the browser, then the download stops silently and can be started again', async () => {
    vi.mocked(downloadToFs).mockRejectedValue(new Error(ErrorMessages.DownloadCancelledFromBrowser));
    const { getByText, queryByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));
    await waitFor(() => expect(getDownloadAbortController()?.signal.aborted).toBe(true));
    act(() => vi.mocked(network.downloadFile).mock.calls[0][0].options?.notifyProgress(FILE_SIZE, FILE_SIZE / 2));

    expect(getByText('actions.download')).toBeInTheDocument();
    expect(queryByText('50%')).not.toBeInTheDocument();
    expect(queryByText('actions.downloaded')).not.toBeInTheDocument();
    expect(notificationsService.show).not.toHaveBeenCalled();
    expect(errorService.reportError).not.toHaveBeenCalled();
  });

  test('when the download support is still being checked, then the network download has not started yet', async () => {
    let resolveSupport!: (support: DownloadSupport) => void;
    vi.mocked(getDownloadSupport).mockReturnValue(new Promise((resolve) => (resolveSupport = resolve)));
    vi.mocked(downloadToFs).mockResolvedValue(undefined);
    const { getByText } = await renderLoadedView();

    fireEvent.click(getByText('actions.download'));
    await waitFor(() => expect(getDownloadSupport).toHaveBeenCalled());
    const hasDownloadStartedBeforeSupport = vi.mocked(network.downloadFile).mock.calls.length > 0;
    await act(async () => resolveSupport(DownloadSupport.PartialStreamApi));

    expect(hasDownloadStartedBeforeSupport).toBe(false);
    expect(network.downloadFile).toHaveBeenCalledTimes(1);
  });
});
