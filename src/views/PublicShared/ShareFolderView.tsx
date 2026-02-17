import UilArrowRight from '@iconscout/react-unicons/icons/uil-arrow-right';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { PublicSharedItemInfo, SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'services/error.service';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import shareService, { downloadPublicSharedFolder, getPublicSharingMeta } from 'app/share/services/share.service';
import { TaskProgress } from 'app/tasks/types';
import { useEffect, useState } from 'react';
import { match } from 'react-router';
import { Link } from 'react-router-dom';
import { HTTP_CODES } from 'app/core/constants';
import { AppError } from '@internxt/sdk';
import { useAppSelector } from 'app/store/hooks';
import { SendBanner, ShareItemPwdView } from './components';
import './components/ShareView.scss';
import { Loader } from '@internxt/ui';
import { stringUtils } from '@internxt/lib';

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

  const code = props.match.params.code;
  const sharingId = stringUtils.decodeV4Uuid(props.match.params.token);

  const [progress, setProgress] = useState(TaskProgress.Min);
  const [nItems, setNItems] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [info, setInfo] = useState<SharingMeta | Record<string, any>>({});
  const [itemData, setItemData] = useState<PublicSharedItemInfo>();
  const [size, setSize] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [itemPassword, setItemPassword] = useState('');
  const [sendBannerVisible, setSendBannerVisible] = useState(false);
  const [folderSize, setFolderSize] = useState<string | null>(null);
  const [isGetFolderSizeError, setIsGetFolderSizeError] = useState<boolean>(false);

  let body, downloadButton;

  const handleLoadFolderError = (err) => {
    if (err.status !== HTTP_CODES.FORBIDDEN) {
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
      throw new Error(translate('error.linkExpired'));
    }
  };

  useEffect(() => {
    loadFolderInfo().catch(handleLoadFolderError);
  }, []);

  async function loadFolderInfo(password?: string) {
    // ! iOS Chrome is not supported
    if (/CriOS/.test(navigator.userAgent)) {
      throw new Error(CHROME_IOS_ERROR_MESSAGE);
    }

    return getPublicSharingMeta(sharingId, code, password)
      .then((res) => {
        setInfo({ ...res });
        setIsLoaded(true);
        setRequiresPassword(false);
        getFolderSize(res.id);
        return 0;
      })
      .then((folderSize) => {
        setSize(folderSize);
      })
      .catch(async (err) => {
        if (err.status === HTTP_CODES.FORBIDDEN) {
          await getSharedFolderInfo(sharingId);
          setRequiresPassword(true);
          setIsLoaded(true);
        }
        throw new AppError(err.message, err.status);
      });
  }

  const getSharedFolderInfo = async (id: string) => {
    try {
      const itemData = await shareService.getPublicSharedItemInfo(id);
      setItemData(itemData);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const updateProgress = (progress: number) => {
    setProgress(Number((progress * 100).toFixed(2)));
  };

  const incrementItemCount = () => {
    setNItems((prevNItems) => prevNItems + 1);
  };

  const download = async (): Promise<void> => {
    if (!isDownloading) {
      const folderInfo = info as unknown as ShareTypes.ShareLink | null;

      if (folderInfo) {
        setIsDownloading(true);

        downloadPublicSharedFolder({
          encryptionKey: folderInfo.encryptionKey,
          item: folderInfo.item,
          code,
          incrementItemCount,
        })
          .then(() => {
            updateProgress(1);
            setTimeout(() => {
              setSendBannerVisible(true);
            }, 3000);
          })
          .catch((err) => {
            if (err?.message?.includes('user aborted')) {
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

  const getFolderSize = async (folderId: string) => {
    try {
      setIsGetFolderSizeError(false);
      const folderData = await shareService.getSharedFolderSize(folderId);

      const folderSizeToString = sizeService.bytesToString(folderData.size);
      setFolderSize(folderSizeToString);
    } catch (error) {
      setIsGetFolderSizeError(true);
      errorService.reportError(error);
    }
  };

  useEffect(() => {
    if (isDownloading && progress < 100) {
      window.addEventListener('beforeunload', handleLeavePage);

      return () => window.removeEventListener('beforeunload', handleLeavePage);
    }
  }, [progress]);

  if (isDownloading) {
    downloadButton =
      progress < 100 ? (
        <>
          <Loader classNameLoader="mr-1 h-5 w-5 text-white" size={24} />
          <span>{translate('actions.downloadingItems', { nItems })}</span>
          {!!size && size > 0 && <span className="font-normal text-primary/20">{progress}%</span>}
        </>
      ) : (
        <>
          <UilCheck height="24" width="24" />
          <span className="font-medium">{translate('actions.downloaded')}</span>
        </>
      );
  } else {
    downloadButton = (
      <>
        <UilImport height="20" width="20" />
        <span className="font-medium">{translate('actions.download')}</span>
      </>
    );
  }

  const renderErrorState = () => {
    const ItemIconComponent = iconService.getItemIcon(false, 'default');
    return (
      <>
        <div className="relative h-32 w-32">
          <ItemIconComponent className="absolute -top-2.5 left-7 rotate-10 drop-shadow-soft" />
          <ItemIconComponent className="absolute -left-7 top-0.5 -rotate-10 drop-shadow-soft" />
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">Shared files no longer available</span>
          <span className="text-gray-60">{errorMessage}</span>
        </div>

        {isAuthenticated && (
          <Link to="/" className="cursor-pointer text-gray-90 no-underline hover:text-gray-90">
            <div
              className="flex h-10 flex-row items-center justify-center space-x-2 rounded-lg bg-gray-5
                          px-6 font-medium"
            >
              <span>Open Internxt Drive</span>
              <UilArrowRight height="20" width="20" />
            </div>
          </Link>
        )}
      </>
    );
  };

  const renderLoadedState = () => {
    const FileIcon = iconService.getItemIcon(true);

    if (requiresPassword) {
      return (
        <ShareItemPwdView
          onPasswordSubmitted={loadFolderInfo}
          itemPassword={itemPassword}
          setItemPassword={setItemPassword}
          itemData={itemData}
        />
      );
    }

    return (
      <>
        <SendBanner sendBannerVisible={sendBannerVisible} setSendBannerVisible={setSendBannerVisible} />

        {/* File info */}
        <div className="flex grow-0 flex-col items-center justify-center space-y-4">
          <div className="h-32 w-32 drop-shadow-soft">
            <FileIcon />
          </div>

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex flex-col items-center justify-center text-center font-medium">
              <abbr className="w-screen max-w-prose break-words px-10 text-xl sm:w-full" title={info?.item?.plainName}>
                {info?.item?.plainName}
              </abbr>
              {!isGetFolderSizeError &&
                (folderSize === null ? (
                  <Loader size={24} />
                ) : (
                  <span className="text-gray-60"> {folderSize || '0MB'}</span>
                ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row items-center justify-center">
          <button
            onClick={() => {
              download();
            }}
            className={`flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg px-6 font-medium
                        text-white ${progress && progress >= 100 ? 'bg-green' : 'bg-primary'}`}
          >
            {downloadButton}
          </button>
        </div>
      </>
    );
  };

  if (isError) {
    body = renderErrorState();
  } else if (isLoaded) {
    body = renderLoadedState();
  } else {
    body = <Loader classNameContainer="h-8 w-8 text-gray-30" />;
  }
  return body;
}
