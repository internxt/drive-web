/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useState, useEffect } from 'react';
import { match } from 'react-router';
import { aes } from '@internxt/lib';
import shareService, { getSharedFileInfo } from 'app/share/services/share.service';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import network from 'app/network';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../../app/store/hooks';
import FileViewer from '../../../../app/drive/components/FileViewer/FileViewer';
import fileExtensionService from '../../../drive/services/file-extension.service';
import { fileExtensionPreviewableGroups } from '../../../drive/types/file-types';

import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-arrow-right';
import UilImport from '@iconscout/react-unicons/icons/uil-import';

import './ShareView.scss';
import downloadService from 'app/drive/services/download.service';
import errorService from 'app/core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { binaryStreamToBlob } from 'app/core/services/stream.service';
import ShareItemPwdView from './ShareItemPwdView';
import SendBanner from './SendBanner';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export interface ShareViewProps extends ShareViewState {
  match: match<{
    token: string;
    code: string;
  }>;
}

interface GetShareInfoWithDecryptedName extends ShareTypes.ShareLink {
  name: string | null;
}

interface ShareViewState {
  token: string;
  progress: number;
  isDownloading: boolean;
  info: GetShareInfoWithDecryptedName | null;
  error: Error | null;
  accessedFile: boolean;
  openPreview: boolean;
  isAuthenticated: boolean;
  user: UserSettings | null;
}

export default function ShareFileView(props: ShareViewProps): JSX.Element {
  const { translate } = useTranslationContext();
  const token = props.match.params.token;
  const code = props.match.params.code;
  const [progress, setProgress] = useState(TaskProgress.Min);
  const [isDownloading, setIsDownloading] = useState(false);
  const [info, setInfo] = useState<Partial<ShareTypes.ShareLink & { name: string }>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [itemPassword, setItemPassword] = useState('');
  const [sendBannerVisible, setIsSendBannerVisible] = useState(false);

  let body;

  useEffect(() => {
    loadInfo().catch((err) => {
      if (err.message !== 'Forbidden') {
        setIsLoaded(true);
        setIsError(true);
        /**
         * TODO: Check that the server returns proper error message instead
         * of assuming that everything means that the link has expired
         */
        throw new Error(translate('error.linkExpired') as string);
      }
    });
  }, []);

  const Spinner = (
    <>
      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824
              3 7.938l3-2.647z"
        ></path>
      </svg>
    </>
  );

  const closePreview = () => {
    setOpenPreview(false);
  };

  const isTypeAllowed = () => {
    const extensionsList = fileExtensionService.computeExtensionsLists(fileExtensionPreviewableGroups);
    const extensionsWithFileViewer = Object.entries(extensionsList)
      .map((arr) => arr[1])
      .filter((arr) => arr.length > 0);
    for (const extensions of extensionsWithFileViewer) {
      if (extensions.includes(info?.item?.type || '')) {
        return true;
      }
    }
  };

  const getDecryptedName = (info: ShareTypes.ShareLink): string => {
    const salt = `${process.env.REACT_APP_CRYPTO_SECRET2}-${info.item.id.toString()}`;
    const decryptedFilename = aes.decrypt(info.item.name, salt);

    return decryptedFilename;
  };

  const getFormatFileName = (): string => {
    const hasType = info?.item?.type !== null;
    const extension = hasType ? `.${info?.item?.type}` : '';
    return `${info?.item?.name}${extension}`;
  };

  const getFormatFileSize = (): string => {
    return sizeService.bytesToString(info?.item?.size || 0);
  };

  function loadInfo(password?: string) {
    return getSharedFileInfo(token, code, password)
      .then((info) => {
        setIsLoaded(true);
        setRequiresPassword(false);
        setInfo({
          ...info,
          name: info.item.name,
        });
      })
      .catch((err) => {
        if (err.message === 'Forbidden') {
          setRequiresPassword(true);
          setIsLoaded(true);
        }

        throw err;
      });
  }

  function getBlob(abortController: AbortController): Promise<Blob> {
    const fileInfo = info as unknown as ShareTypes.ShareLink;

    const encryptionKey = fileInfo.encryptionKey;

    const readable = network.downloadFile({
      bucketId: fileInfo.bucket,
      fileId: fileInfo.item.fileId,
      encryptionKey: Buffer.from(encryptionKey, 'hex'),
      token: (fileInfo as any).fileToken,
      options: {
        abortController,
        notifyProgress: () => null,
      },
    });

    return readable.then(binaryStreamToBlob);
  }

  function onDownloadFromPreview() {
    setOpenPreview(false);
    download();
  }

  const download = async (): Promise<void> => {
    if (!isDownloading) {
      const fileInfo = info as unknown as ShareTypes.ShareLink;
      const MIN_PROGRESS = 0;

      if (fileInfo) {
        const encryptionKey = fileInfo.encryptionKey;

        setProgress(MIN_PROGRESS);
        setIsDownloading(true);
        const readable = await network.downloadFile({
          bucketId: fileInfo.bucket,
          fileId: fileInfo.item.fileId,
          encryptionKey: Buffer.from(encryptionKey, 'hex'),
          token: (fileInfo as any).fileToken,
          options: {
            notifyProgress: (totalProgress, downloadedBytes) => {
              const progress = Math.trunc((downloadedBytes / totalProgress) * 100);
              setProgress(progress);
              if (progress == 100) {
                shareService.incrementShareView(fileInfo.token);
                setIsDownloading(false);
              }
            },
          },
        });
        const fileBlob = await binaryStreamToBlob(readable);

        await downloadService.downloadFileFromBlob(fileBlob, getFormatFileName());
        setTimeout(() => {
          setIsSendBannerVisible(true);
        }, 3000);
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
          <span className="text-cool-gray-60">Link expired or files deleted</span>
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
    const FileIcon = iconService.getItemIcon(false, info?.item?.type);

    body = requiresPassword ? (
      <ShareItemPwdView onPasswordSubmitted={loadInfo} itemPassword={itemPassword} setItemPassword={setItemPassword} />
    ) : (
      <>
        {/* File info */}
        <div className="flex flex-grow-0 flex-col items-center justify-center space-y-4">
          <div className="h-32 w-32 drop-shadow-soft filter">
            <FileIcon />
          </div>

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex flex-col items-center justify-center text-center font-medium">
              <abbr className="w-screen max-w-prose break-words px-10 text-xl sm:w-full" title={getFormatFileName()}>
                {getFormatFileName()}
              </abbr>
              <span className="text-cool-gray-60">{getFormatFileSize()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row items-center justify-center space-x-3">
          {isTypeAllowed() && (
            <button
              onClick={() => {
                setOpenPreview(true);
              }}
              className="flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg bg-blue-10 px-6
                        font-medium text-blue-60 active:bg-blue-20 active:bg-opacity-65"
            >
              <UilEye height="20" width="20" />
              <span>{translate('actions.view')}</span>
            </button>
          )}

          <button
            onClick={download}
            className={`flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg px-6 font-medium
                        text-white ${progress && !(progress < 100) ? 'bg-green' : 'bg-blue-60'}`}
          >
            {Number(progress) == 100 ? (
              <>
                {/* Download completed */}
                <UilCheck height="24" width="24" />
                <span className="font-medium">{translate('actions.downloaded')}</span>
              </>
            ) : isDownloading ? (
              <>
                {/* Download in progress */}
                <div className="mr-1 h-5 w-5 text-white">{Spinner}</div>
                <span>{translate('actions.downloading')}</span>
                <span className="font-normal text-blue-20">{progress}%</span>
              </>
            ) : (
              <>
                {/* Download button */}
                <UilImport height="20" width="20" />
                <span className="font-medium">{translate('actions.download')}</span>
              </>
            )}
          </button>
        </div>
      </>
    );
  } else {
    body = <div className="h-8 w-8 text-cool-gray-30">{Spinner}</div>;
  }

  return (
    <>
      <SendBanner sendBannerVisible={sendBannerVisible} setIsSendBannerVisible={setIsSendBannerVisible} />
      <FileViewer
        show={openPreview}
        file={info['item']}
        onClose={closePreview}
        onDownload={onDownloadFromPreview}
        downloader={getBlob}
      />
      {body}
    </>
  );
}
