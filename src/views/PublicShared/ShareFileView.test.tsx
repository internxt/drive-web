import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { match } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { ErrorMessages } from 'app/core/constants';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import shareService from 'app/share/services/share.service';
import errorService from 'services/error.service';
import ShareFileView from './ShareFileView';

vi.mock('app/store/hooks', () => ({
  useAppSelector: vi.fn().mockReturnValue(false),
  useAppDispatch: vi.fn(),
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const FILE_SIZE = 1000;
const SHARING_ID = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';
const BANNER_WAIT_TIMEOUT_MS = 4000;

const sharingMeta = {
  encryptionKey: 'abcd',
  itemToken: 'item-token',
  item: { plainName: 'report', type: 'pdf', size: FILE_SIZE, bucket: 'bucket-id', fileId: 'file-id' },
} as unknown as SharingMeta;

const routeMatch: match<{ token: string; code: string }> = {
  params: { token: SHARING_ID.replaceAll('-', ''), code: 'code' },
  isExact: true,
  path: '',
  url: '',
};

const mockedDownloadPublicSharedFile = () => vi.mocked(shareService.downloadPublicSharedFile);

const getDownloadOptions = () => mockedDownloadPublicSharedFile().mock.calls[0][0];

const renderLoadedView = async () => {
  const view = render(<ShareFileView match={routeMatch} token={SHARING_ID} />);
  await waitFor(() => expect(view.getByText('actions.download')).toBeInTheDocument());
  return view;
};

const startDownload = async () => {
  const view = await renderLoadedView();
  fireEvent.click(view.getByText('actions.download'));
  return view;
};

describe('Public shared file download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(shareService, 'getPublicSharingMeta').mockResolvedValue(sharingMeta);
    vi.spyOn(shareService, 'downloadPublicSharedFile').mockResolvedValue(undefined);
    vi.spyOn(notificationsService, 'show').mockImplementation(() => 'toast-id');
    vi.spyOn(errorService, 'reportError').mockImplementation(() => undefined);
  });

  test('when the download starts, then the shared file is downloaded with its name, network data and an abort controller', async () => {
    await startDownload();

    await waitFor(() =>
      expect(shareService.downloadPublicSharedFile).toHaveBeenCalledWith({
        file: { bucketId: 'bucket-id', fileId: 'file-id', size: FILE_SIZE, encryptionKey: 'abcd', token: 'item-token' },
        filename: 'report.pdf',
        abortController: expect.any(AbortController),
        onProgress: expect.any(Function),
      }),
    );
  });

  test('when every byte has been read, then the file is shown as downloaded only once it is saved to disk', async () => {
    let finishSaving!: () => void;
    mockedDownloadPublicSharedFile().mockImplementation(({ onProgress }) => {
      onProgress(1);
      return new Promise<void>((resolve) => (finishSaving = resolve));
    });
    const { getByText, queryByText } = await startDownload();

    await waitFor(() => expect(getByText('99%')).toBeInTheDocument());
    const wasDownloadedBeforeSaving = queryByText('actions.downloaded') !== null;
    await act(async () => finishSaving());

    expect(wasDownloadedBeforeSaving).toBe(false);
    expect(getByText('actions.downloaded')).toBeInTheDocument();
  });

  test('when the download fails, then an error is shown and the user can download again', async () => {
    mockedDownloadPublicSharedFile().mockRejectedValue(new Error('network error'));
    const { getByText, queryByText } = await startDownload();

    await waitFor(() =>
      expect(notificationsService.show).toHaveBeenCalledWith({ text: 'error.downloadingFile', type: ToastType.Error }),
    );
    expect(getByText('actions.download')).toBeInTheDocument();
    expect(queryByText('actions.downloaded')).not.toBeInTheDocument();
  });

  test('when the download fails, then the download is aborted and the error is reported', async () => {
    mockedDownloadPublicSharedFile().mockRejectedValue(new Error('disk full'));

    await startDownload();

    await waitFor(() => expect(errorService.reportError).toHaveBeenCalled());
    expect(getDownloadOptions().abortController.signal.aborted).toBe(true);
  });

  test('when the download is cancelled from the browser, then the download stops silently and can be started again', async () => {
    mockedDownloadPublicSharedFile().mockRejectedValue(new Error(ErrorMessages.DownloadCancelledFromBrowser));
    const { getByText, queryByText } = await startDownload();

    await waitFor(() => expect(getDownloadOptions().abortController.signal.aborted).toBe(true));
    act(() => getDownloadOptions().onProgress(0.5));

    expect(getByText('actions.download')).toBeInTheDocument();
    expect(queryByText('50%')).not.toBeInTheDocument();
    expect(queryByText('actions.downloaded')).not.toBeInTheDocument();
    expect(notificationsService.show).not.toHaveBeenCalled();
    expect(errorService.reportError).not.toHaveBeenCalled();
  });

  test('when the download button is clicked again while downloading, then the file is downloaded only once', async () => {
    mockedDownloadPublicSharedFile().mockReturnValue(new Promise<void>(() => undefined));
    const { getByText } = await startDownload();

    await waitFor(() => expect(shareService.downloadPublicSharedFile).toHaveBeenCalled());
    fireEvent.click(getByText('0%'));

    expect(shareService.downloadPublicSharedFile).toHaveBeenCalledTimes(1);
  });

  test('when the user leaves the page while downloading, then the browser asks to confirm leaving', async () => {
    mockedDownloadPublicSharedFile().mockReturnValue(new Promise<void>(() => undefined));

    await startDownload();
    const leavePageEvent = new Event('beforeunload', { cancelable: true });
    await waitFor(() => expect(shareService.downloadPublicSharedFile).toHaveBeenCalled());
    globalThis.dispatchEvent(leavePageEvent);

    expect(leavePageEvent.defaultPrevented).toBe(true);
  });

  test('when the file has been downloaded, then the Internxt banner is shown shortly after', async () => {
    const { getByText } = await renderLoadedView();
    const isBannerVisibleBeforeDownload = getByText('Try out Internxt').checkVisibility();

    fireEvent.click(getByText('actions.download'));

    await waitFor(() => expect(getByText('Try out Internxt')).toBeVisible(), { timeout: BANNER_WAIT_TIMEOUT_MS });
    expect(isBannerVisibleBeforeDownload).toBe(false);
  });
});
