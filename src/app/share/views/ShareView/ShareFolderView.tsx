import { useEffect, useState } from 'react';
import { WritableStream } from 'streamsaver';
import { match } from 'react-router';
import { getSharedFolderInfo, getSharedFolderSize } from 'app/share/services/share.service';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-arrow-right';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import './ShareView.scss';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import shareService from 'app/share/services/share.service';
import { downloadSharedFolderUsingReadableStream } from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingReadableStream';
import { downloadSharedFolderUsingBlobs } from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingBlobs';
import { loadWritableStreamPonyfill } from 'app/network/download';
import ShareItemPwdView from './ShareItemPwdView';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'app/core/services/error.service';
import SendBanner from './SendBanner';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ReportButton from './ReportButon';

interface ShareViewProps extends ShareViewState {
  match: match<{
    token: string;
    code: string;
  }>;
}

interface ShareViewState {
  token: string;
  code: string;
  error: string | null;
  progress: number;
  ready: boolean;
  info: ShareTypes.ShareLink;
}

const CHROME_IOS_ERROR_MESSAGE = 'Chrome on iOS is not supported. Use Safari to proceed';

export default function ShareFolderView(props: ShareViewProps): JSX.Element {
  const { translate } = useTranslationContext();
  const FOLDERS_LIMIT_BY_REQUEST = 16;
  const FILES_LIMIT_BY_REQUEST = 128;
  const token = props.match.params.token;
  const code = props.match.params.code;
  const [progress, setProgress] = useState(TaskProgress.Min);
  const [isDownloading, setIsDownloading] = useState(false);
  const [info, setInfo] = useState<Partial<ShareLink>>({});
  const [size, setSize] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [itemPassword, setItemPassword] = useState('');
  const [sendBannerVisible, setIsSendBannerVisible] = useState(false);

  const canUseReadableStreamMethod =
    'WritableStream' in window &&
    'ReadableStream' in window &&
    new ReadableStream().pipeTo !== undefined &&
    new ReadableStream().pipeThrough !== undefined &&
    WritableStream !== undefined;

  let body, downloadButton;

  useEffect(() => {
    loadFolderInfo().catch((err) => {
      if (err.message !== 'Forbidden') {
        setIsLoaded(true);
        if (err.message === CHROME_IOS_ERROR_MESSAGE) {
          notificationsService.show({
            text: errorService.castError(err).message,
            type: ToastType.Warning,
            duration: 50000,
          });
          setErrorMessage(CHROME_IOS_ERROR_MESSAGE);
          return;
        }
        setIsError(true);
        /**
         * TODO: Check that the server returns proper error message instead
         * of assuming that everything means that the link has expired
         */
        throw new Error(translate('error.linkExpired') as string);
      }
    });
  }, []);

  async function loadFolderInfo(password?: string) {
    if (!canUseReadableStreamMethod) {
      // TODO: Hide inside download shared folder function
      loadWritableStreamPonyfill().then(() => {
        console.log('loaded ponyfill');
      });
    }
    // ! iOS Chrome is not supported
    if (navigator.userAgent.match('CriOS')) {
      throw new Error(CHROME_IOS_ERROR_MESSAGE);
    }

    return getSharedFolderInfo(token, password)
      .then((sharedFolderInfo) => {
        setInfo(sharedFolderInfo);
        setIsLoaded(true);
        setRequiresPassword(false);
        // TODO: Commented until apply some fixes to the endpoint
        // return loadSize((sharedFolderInfo as unknown as { id: number }).id, sharedFolderInfo.item.id);
        return Promise.resolve(0);
      })
      .then((folderSize) => {
        setSize(folderSize);
      })
      .catch((err) => {
        if (err.message === 'Forbidden') {
          setRequiresPassword(true);
          setIsLoaded(true);
        }
        throw err;
      });
  }

  const loadSize = (shareId: number, folderId: number): Promise<number> => {
    return getSharedFolderSize(shareId.toString(), folderId.toString());
  };

  const updateProgress = (progress: number) => {
    setProgress(Number((progress * 100).toFixed(2)));
  };

  const download = async (password?: string): Promise<void> => {
    if (!isDownloading) {
      const folderInfo = info as unknown as ShareTypes.ShareLink | null;

      if (folderInfo) {
        setIsDownloading(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let downloadFolder: (...args: any) => Promise<void>;

        if (canUseReadableStreamMethod) {
          /* CHROMIUM: Brave, Safari, Edge */
          downloadFolder = downloadSharedFolderUsingReadableStream;
        } else {
          /* FIREFOX or OLD BROWSERS */
          downloadFolder = downloadSharedFolderUsingBlobs;
        }

        downloadFolder(
          {
            name: folderInfo.item.name,
            code: code,
            id: folderInfo.item.id,
            token: token,
            password,
          },
          folderInfo.bucket,
          (folderInfo as any).fileToken,
          {
            filesLimit: FILES_LIMIT_BY_REQUEST,
            foldersLimit: FOLDERS_LIMIT_BY_REQUEST,
            progressCallback: (downloadedBytes) => {
              if (size && size > 0) {
                updateProgress(downloadedBytes / size);
              }
            },
          },
        )
          .then(() => {
            updateProgress(1);
            shareService.incrementShareView(folderInfo.token);
            setTimeout(() => {
              setIsSendBannerVisible(true);
            }, 3000);
          })
          .catch((err) => {
            if (err && err.message && err.message.includes('user aborted')) {
              setIsDownloading(false);
              return;
            }
            setErrorMessage(err.message);
            setIsError(true);
          });
      }
    }
  };

  const handleLeavePage = (e) => {
    const confirmationMessage = '';

    e.returnValue = confirmationMessage; //Trident, Chrome 34+
    return confirmationMessage; // WebKit, Chrome <34
  };

  useEffect(() => {
    if (isDownloading && progress < 100) {
      window.addEventListener('beforeunload', handleLeavePage);

      return () => window.removeEventListener('beforeunload', handleLeavePage);
    }
  }, [progress]);

  if (!isDownloading) {
    downloadButton = (
      <>
        <UilImport height="20" width="20" />
        <span className="font-medium">{translate('actions.download')}</span>
      </>
    );
  } else {
    downloadButton =
      progress < 100 ? (
        <>
          <div className="mr-1 h-5 w-5 text-white">
            <Spinner />
          </div>
          <span>{translate('actions.downloading')}</span>
          {!!size && size > 0 && <span className="font-normal text-blue-20">{progress}%</span>}
        </>
      ) : (
        <>
          <UilCheck height="24" width="24" />
          <span className="font-medium">{translate('actions.downloaded')}</span>
        </>
      );
  }

  if (isError) {
    const ItemIconComponent = iconService.getItemIcon(false, 'default');
    body = (
      <>
        <div className="relative h-32 w-32">
          <ItemIconComponent className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
          <ItemIconComponent className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">Shared files no longer available</span>
          <span className="text-cool-gray-60">{errorMessage}</span>
        </div>

        {isAuthenticated && (
          <Link to="/app" className="cursor-pointer text-cool-gray-90 no-underline hover:text-cool-gray-90">
            <div
              className="flex h-10 flex-row items-center justify-center space-x-2 rounded-lg bg-cool-gray-10
                          px-6 font-medium"
            >
              <span>Open Internxt Drive</span>
              <UilArrowRight height="20" width="20" />
            </div>
          </Link>
        )}
      </>
    );
  } else if (isLoaded) {
    const FileIcon = iconService.getItemIcon(true);
    body = requiresPassword ? (
      //WITH PASSWORD
      <ShareItemPwdView
        onPasswordSubmitted={loadFolderInfo}
        itemPassword={itemPassword}
        setItemPassword={setItemPassword}
      />
    ) : (
      //WITHOUT PASSWORD
      <>
        <SendBanner sendBannerVisible={sendBannerVisible} setIsSendBannerVisible={setIsSendBannerVisible} />

        {/* File info */}
        <div className="flex flex-grow-0 flex-col items-center justify-center space-y-4">
          <div className="h-32 w-32 drop-shadow-soft filter">
            <FileIcon />
          </div>

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex flex-col items-center justify-center text-center font-medium">
              <abbr className="w-screen max-w-prose break-words px-10 text-xl sm:w-full" title={info?.item?.name}>
                {info?.item?.name}
              </abbr>
              <span className="text-cool-gray-60">{sizeService.bytesToString(info?.item?.size || 0)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row items-center justify-center">
          <button
            onClick={() => {
              download(itemPassword);
            }}
            className={`flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg px-6 font-medium
                        text-white ${progress && !(progress < 100) ? 'bg-green' : 'bg-blue-60'}`}
          >
            {downloadButton}
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <div className="h-8 w-8 text-cool-gray-30">
        <Spinner />
      </div>
    );
  }
  return body;
}
