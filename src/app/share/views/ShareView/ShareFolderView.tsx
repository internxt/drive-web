import { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';
import { ReactComponent as Logo } from 'assets/icons/brand/x-white.svg';
import { getSharedFolderInfo, getSharedFolderSize } from 'app/share/services/share.service';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import i18n from 'app/i18n/services/i18n.service';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../../../app/core/services/desktop.service';
import bg from 'assets/images/shared-file/bg.png';
import Shield from 'assets/images/shared-file/icons/shield.png';
import EndToEnd from 'assets/images/shared-file/icons/end-to-end.png';
import Lock from 'assets/images/shared-file/icons/lock.png';
import EyeSlash from 'assets/images/shared-file/icons/eye-slash.png';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-arrow-right';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import './ShareView.scss';
import errorService from 'app/core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import { 
  downloadSharedFolderUsingFileSystemAPI 
} from '../../../drive/services/download.service/downloadFolder/downloadSharedFolderUsingFileSystemAPI';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { SharedFolderInfo } from '@internxt/sdk/dist/drive/share/types';
import { 
  downloadSharedFolderUsingReadableStream 
} from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingReadableStream';
import { 
  downloadSharedFolderUsingStreamSaver 
} from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingStreamSaver';

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
  info: ShareTypes.SharedFolderInfo;
}

const ShareFolderView = (props: ShareViewProps): JSX.Element => {
  const FOLDERS_LIMIT_BY_REQUEST = 16;
  const FILES_LIMIT_BY_REQUEST = 128;
  const token = props.match.params.token;
  const code = props.match.params.code;
  const [progress, setProgress] = useState(TaskProgress.Min);
  const [isDownloading, setIsDownloading] = useState(false);
  const [info, setInfo] = useState<Partial<SharedFolderInfo>>({});
  const [size, setSize] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useAppSelector((state) => state.user.user);
  const dispatch = useAppDispatch();

  let body, downloadButton;

  useEffect(() => {
    loadInfo()
      .then((sharedFolderInfo) => {
        setIsLoaded(true);
        setInfo(sharedFolderInfo);

        return loadSize((sharedFolderInfo as any).shareId, sharedFolderInfo.folderId);
      })
      .then((folderSize) => {
        setSize(folderSize);
      })
      .catch((err) => {
        setIsError(true);
        setErrorMessage(errorService.castError(err).message);
      });
  }, []);

  const getAvatarLetters = () => {
    const initials = user && `${user['name'].charAt(0)}${user['lastname'].charAt(0)}`.toUpperCase();

    return initials;
  };

  const downloadDesktopApp = () => {
    window.open(desktopService.getDownloadAppUrl(), '_self');
  };

  const logout = () => {
    dispatch(userThunks.logoutThunk());
  };

  const loadInfo = (): Promise<ShareTypes.SharedFolderInfo> => {
    // ! iOS Chrome is not supported
    if (navigator.userAgent.match('CriOS')) {
      throw new Error('Chrome iOS not supported. Use Safari to proceed');
    }

    return getSharedFolderInfo(token).catch(() => {
      /**
       * TODO: Check that the server returns proper error message instead
       * of assuming that everything means that the link has expired
       */
      throw new Error(i18n.get('error.linkExpired'));
    });
  };

  const loadSize = (shareId: number, folderId: number): Promise<number> => {
    return getSharedFolderSize(shareId, folderId);
  };

  const updateProgress = (progress: number) => {
    setProgress(Number((progress * 100).toFixed(2)));
  };

  const download = async (): Promise<void> => {
    if (!isDownloading) {
      const folderInfo = info as unknown as ShareTypes.SharedFolderInfo | null;

      if (folderInfo) {
        setIsDownloading(true);

        const writableStreamIsSupported = 'WritableStream' in window;
        const directoryPickerIsSupported = 'showDirectoryPicker' in window;

        let downloadFolder: (...args: any) => Promise<void>;

        if (directoryPickerIsSupported) {
          /* LAST VERSION OF CHROMIUM: Chrome */
          downloadFolder = downloadSharedFolderUsingFileSystemAPI;
        } else if (writableStreamIsSupported) {
          /* CHROMIUM: Brave, Safari, Edge */
          downloadFolder = downloadSharedFolderUsingReadableStream;
        } else {
          /* FIREFOX or OLD BROWSERS */
          downloadFolder = downloadSharedFolderUsingStreamSaver;
        }

        downloadFolder(
          {
            name: folderInfo.name,
            code: code,
            id: folderInfo.folderId,
            token: token,
          },
          folderInfo.bucket,
          folderInfo.bucketToken,
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
          })
          .catch((err) => {
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
        <span className="font-medium">{i18n.get('actions.download')}</span>
      </>
    );
  } else {
    downloadButton =
      progress < 100 ? (
        <>
          <div className="h-5 w-5 text-white mr-1">
            <Spinner />
          </div>
          <span>{i18n.get('actions.downloading')}</span>
          {size && size > 0 && <span className="font-normal text-blue-20">{progress}%</span>}
        </>
      ) : (
        <>
          <UilCheck height="24" width="24" />
          <span className="font-medium">{i18n.get('actions.downloaded')}</span>
        </>
      );
  }

  if (isError) {
    const ItemIconComponent = iconService.getItemIcon(false, 'default');

    body = (
      <>
        <div className="relative w-32 h-32">
          <ItemIconComponent className="absolute -top-2.5 left-7 transform rotate-10 filter drop-shadow-soft" />
          <ItemIconComponent className="absolute top-0.5 -left-7 transform rotate-10- filter drop-shadow-soft" />
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">Shared files no longer available</span>
          <span className="text-cool-gray-60">{errorMessage}</span>
        </div>

        {isAuthenticated && (
          <Link to="/app" className="no-underline cursor-pointer text-cool-gray-90 hover:text-cool-gray-90">
            <div
              className="flex flex-row items-center justify-center rounded-lg bg-cool-gray-10 h-10 px-6
                          font-medium space-x-2"
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

    body = (
      <>
        {/* File info */}
        <div className="flex flex-col space-y-4 items-center justify-center flex-grow-0">
          <div className="h-32 w-32 filter drop-shadow-soft">
            <FileIcon />
          </div>

          <div className="flex flex-col justify-center items-center space-y-2">
            <div className="flex flex-col justify-center items-center font-medium text-center">
              <abbr className="text-xl w-screen sm:w-full max-w-prose break-words px-10" title={info.name}>
                {info.name}
              </abbr>
              <span className="text-cool-gray-60">{sizeService.bytesToString(info.size || 0)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row space-x-3 items-center justify-center">
          <button
            onClick={download}
            className={`flex flex-row items-center h-10 px-6 rounded-lg text-white space-x-2 cursor-pointer
                        font-medium ${progress && !(progress < 100) ? 'bg-green-40' : 'bg-blue-60'}`}
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

  return (
    <>
      {/* Content */}
      <div className="flex flex-row justify-center items-stretch h-screen bg-white text-cool-gray-90">
        {/* Banner */}
        <div className="relative hidden lg:flex flex-col w-96 h-full bg-blue-80 text-white flex-shrink-0">
          <img src={bg} className="absolute top-0 left-0 object-cover object-center h-full w-full" />

          <div className="flex flex-col space-y-12 p-12 h-full z-10">
            <div className="relative flex flex-row items-center space-x-2 font-semibold">
              <Logo className="w-4 h-4" />
              <span>INTERNXT</span>
            </div>

            <div className="flex flex-col justify-center h-full space-y-20">
              <div className="flex flex-col space-y-2">
                <span className="opacity-60 text-xl">WE ARE INTERNXT</span>
                <p className="text-5xl-banner font-semibold leading-none">Private and secure cloud storage</p>
              </div>

              <div className="flex flex-col space-y-3 text-xl">
                {[
                  { icon: Shield, label: 'Privacy by design' },
                  { icon: EndToEnd, label: 'End-to-end encryption' },
                  { icon: Lock, label: 'Military-grade encryption' },
                  { icon: EyeSlash, label: 'Zero-knowledge technology' },
                ].map((item) => (
                  <div className="flex flex-row items-center space-x-3" key={item.icon}>
                    <img src={item.icon} className="w-6 h-6" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <Link to="/new" className="no-underline">
                <div
                  className="flex flex-row items-center justify-center rounded-xl no-underline ring-3 ring-blue-30
                                p-1 cursor-pointer"
                >
                  <div
                    className="flex flex-row items-center justify-center w-full h-12 bg-white text-blue-70
                                  rounded-lg no-underline text-xl font-semibold px-6"
                  >
                    <span>Get 10GB for FREE</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Download container */}
        <div className="flex flex-col flex-1">
          {/* Top bar */}
          <div className="flex flex-row justify-end items-center h-20 px-6 flex-shrink-0">
            {isAuthenticated ? (
              <>
                {/* User avatar */}
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="inline-flex justify-center w-full px-4 py-2 font-medium
                                              rounded-lg focus:outline-none focus-visible:ring-2
                                              focus-visible:ring-blue-20 focus-visible:ring-opacity-75"
                    >
                      <div className="flex flex-row space-x-3">
                        <div
                          className="flex flex-row items-center justify-center rounded-full bg-blue-10
                                        text-blue-80 h-8 w-8"
                        >
                          <span className="font-semibold text-sm">{getAvatarLetters()}</span>
                        </div>
                        <div className="flex flex-row items-center font-semibold">
                          <span>{`${user && user['name']} ${user && user['lastname']}`}</span>
                        </div>
                      </div>
                    </Menu.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items
                      className="absolute right-0 origin-top-right bg-white rounded-md shadow-lg ring-1
                                            ring-cool-gray-100 ring-opacity-5 focus:outline-none p-1 whitespace-nowrap
                                            "
                    >
                      <Menu.Item>
                        {({ active }) => (
                          <Link to="/app" className="no-underline text-cool-gray-90 hover:text-cool-gray-90">
                            <button
                              className={`${active && 'bg-cool-gray-5'} group flex rounded-md items-center w-full
                                            px-4 py-2 font-medium`}
                            >
                              Go to Internxt Drive
                            </button>
                          </Link>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              downloadDesktopApp();
                            }}
                            className={`${active && 'bg-cool-gray-5'} group flex rounded-md items-center w-full
                                            px-4 py-2 font-medium`}
                          >
                            Download Desktop App
                          </button>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              logout();
                            }}
                            className={`${active && 'bg-red-10 bg-opacity-50 text-red-60'} group flex rounded-md
                                            items-center w-full px-4 py-2 font-medium`}
                          >
                            Log out
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </>
            ) : (
              <>
                {/* Login / Create account */}
                <div className="flex flex-row space-x-3">
                  <Link to="/login" className="no-underline">
                    <div
                      className="flex flex-row items-center justify-center rounded-lg h-9 px-4 font-medium
                                    text-cool-gray-90 hover:text-cool-gray-90 cursor-pointer no-underline"
                    >
                      Login
                    </div>
                  </Link>

                  <Link to="/new" className="no-underline">
                    <div
                      className="flex flex-row items-center justify-center rounded-lg bg-cool-gray-10 h-9 px-4
                                    font-medium text-cool-gray-90 hover:text-cool-gray-90 cursor-pointer
                                    no-underline"
                    >
                      Create account
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* File container */}
          <div className="flex flex-col items-center justify-center space-y-10 h-full mb-20">{body}</div>
        </div>
      </div>
    </>
  );
};
export default ShareFolderView;
