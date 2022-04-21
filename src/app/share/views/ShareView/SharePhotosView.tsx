import { useState, useEffect, Fragment } from 'react';
import streamSaver from 'streamsaver';
import { Menu, Transition } from '@headlessui/react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';
import { ReactComponent as Logo } from 'assets/icons/brand/x-white.svg';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import i18n from 'app/i18n/services/i18n.service';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../../core/services/desktop.service';
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
import Spinner from '../../../shared/components/Spinner/Spinner';
import { GetPhotoShareResponse, PhotoId } from '@internxt/sdk/dist/photos';
import { SdkFactory } from '../../../core/factory/sdk';
import { Network } from '../../../drive/services/network.service';
import downloadService from '../../../drive/services/download.service';
import JSZip from 'jszip';
import { Readable } from 'stream';

interface SharePhotosProps {
  match: match<{
    token: string;
    code: string;
  }>;
}

const SharePhotosView = (props: SharePhotosProps): JSX.Element => {
  const { token, code } = props.match.params;

  const [progress, setProgress] = useState(TaskProgress.Min);
  const [isDownloading, setIsDownloading] = useState(false);
  const [info, setInfo] = useState<GetPhotoShareResponse | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useAppSelector((state) => state.user.user);
  const dispatch = useAppDispatch();

  let body, downloadButton;

  useEffect(() => {
    loadInfo()
      .then(setInfo)
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

  const loadInfo = (): Promise<GetPhotoShareResponse> => {
    // ! iOS Chrome is not supported
    if (navigator.userAgent.match('CriOS')) {
      throw new Error('Chrome iOS not supported. Use Safari to proceed');
    }

    const { shares } = SdkFactory.getInstance().createPhotosClient();

    return shares.getShare(token, code).catch(() => {
      /**
       * TODO: Check that the server returns proper error message instead
       * of assuming that everything means that the link has expired
       */
      throw new Error(i18n.get('error.linkExpired'));
    });
  };

  const updateProgress = (progress: number) => {
    setProgress(Number((progress * 100).toFixed(2)));
  };

  const download = async (): Promise<void> => {
    setIsDownloading(true);
    const network = new Network('NONE', 'NONE', 'NONE');
    const fileToken = info?.token;
    try {
      if (info?.photos.length === 1) {
        const photo = info.photos[0];
        const [fileBlobPromise] = network.downloadFile(info.bucket, photo.fileId, {
          fileEncryptionKey: Buffer.from(photo.decryptionKey, 'hex'),
          fileToken,
          progressCallback: updateProgress,
        });
        const fileBlob = await fileBlobPromise;

        downloadService.downloadFileFromBlob(fileBlob, `${photo.name}.${photo.type}`);
      } else if (info && info.photos.length > 1) {
        const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

        if (isBrave) {
          throw new Error(i18n.get('error.browserNotSupported', { userAgent: 'Brave' }));
        }

        const zip = new JSZip();

        const writableStream = streamSaver.createWriteStream('photos.zip', {});
        const writer = writableStream.getWriter();

        const generalProgress: Record<PhotoId, number> = {};

        const updateTaskProgress = () => {
          const totalSize = info.photos.reduce((prev, current) => prev + current.size, 0);
          const currentSize = info.photos.reduce(
            (prev, current) => prev + current.size * (generalProgress[current.fileId] ?? 0),
            0,
          );

          updateProgress(currentSize / totalSize);
        };

        for (const photo of info.photos) {
          const photoName = `${photo.name}.${photo.type}`;
          const photoSource = network.getFileDownloadStream(info.bucket, photo.fileId, {
            progressCallback: (progress) => {
              generalProgress[photo.fileId] = progress;
              updateTaskProgress();
            },
            fileEncryptionKey: Buffer.from(photo.decryptionKey, 'hex'),
            fileToken,
          });

          const [readable] = photoSource;
          zip.file(photoName, await readable, { compression: 'DEFLATE' });
        }
        await new Promise<void>((resolve, reject) => {
          const zipStream = zip.generateInternalStream({
            type: 'uint8array',
            streamFiles: true,
            compression: 'DEFLATE',
          }) as Readable;
          zipStream
            ?.on('data', (chunk: Buffer) => {
              writer.write(chunk);
            })
            .on('end', () => {
              writer.close();
              resolve();
            })
            .on('error', (err) => {
              reject(err);
            });
          zipStream.resume();
        });
      }
    } catch (err) {
      setIsError(true);
      setErrorMessage(errorService.castError(err).message);
      setIsDownloading(false);
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
          <div className="mr-1 h-5 w-5 text-white">
            <Spinner />
          </div>
          <span>{i18n.get('actions.downloading')}</span>
          {<span className="font-normal text-blue-20">{progress}%</span>}
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
        <div className="relative h-32 w-32">
          <ItemIconComponent className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
          <ItemIconComponent className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
        </div>

        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">Shared photos no longer available</span>
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
  } else if (info) {
    const FileIcon = info.photos.length > 1 ? ImagesIcon : iconService.getItemIcon(false, 'png');
    const title =
      info.photos.length === 1 ? `${info.photos[0].name}.${info.photos[0].type}` : `${info.photos.length} photos`;
    const size = info.photos.reduce((prev, current) => prev + current.size, 0);

    body = (
      <>
        {/* File info */}
        <div className="flex flex-grow-0 flex-col items-center justify-center space-y-4">
          <div className="h-32 w-32 drop-shadow-soft filter">
            <FileIcon />
          </div>

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex flex-col items-center justify-center text-center font-medium">
              <abbr className="w-screen max-w-prose break-words px-10 text-xl sm:w-full" title={title}>
                {title}
              </abbr>
              <span className="text-cool-gray-60">{sizeService.bytesToString(size)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row items-center justify-center space-x-3">
          <button
            onClick={download}
            className={`flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg px-6 font-medium
                        text-white ${progress && !(progress < 100) ? 'bg-green-40' : 'bg-blue-60'}`}
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
      <div className="flex h-screen flex-row items-stretch justify-center bg-white text-cool-gray-90">
        {/* Banner */}
        <div className="relative hidden h-full w-96 flex-shrink-0 flex-col bg-blue-80 text-white lg:flex">
          <img src={bg} className="absolute top-0 left-0 h-full w-full object-cover object-center" />

          <div className="z-10 flex h-full flex-col space-y-12 p-12">
            <div className="relative flex flex-row items-center space-x-2 font-semibold">
              <Logo className="h-4 w-4" />
              <span>INTERNXT</span>
            </div>

            <div className="flex h-full flex-col justify-center space-y-20">
              <div className="flex flex-col space-y-2">
                <span className="text-xl opacity-60">WE ARE INTERNXT</span>
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
                    <img src={item.icon} className="h-6 w-6" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <Link to="/new" className="no-underline">
                <div
                  className="flex cursor-pointer flex-row items-center justify-center rounded-xl p-1 no-underline
                                ring-3 ring-blue-30"
                >
                  <div
                    className="flex h-12 w-full flex-row items-center justify-center rounded-lg bg-white
                                  px-6 text-xl font-semibold text-blue-70 no-underline"
                  >
                    <span>Get 10GB for FREE</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Download container */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <div className="flex h-20 flex-shrink-0 flex-row items-center justify-end px-6">
            {isAuthenticated ? (
              <>
                {/* User avatar */}
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="focus:outline-none inline-flex w-full justify-center rounded-lg px-4
                                              py-2 font-medium focus-visible:ring-2
                                              focus-visible:ring-blue-20 focus-visible:ring-opacity-75"
                    >
                      <div className="flex flex-row space-x-3">
                        <div
                          className="flex h-8 w-8 flex-row items-center justify-center
                                        rounded-full bg-blue-10 text-blue-80"
                        >
                          <span className="text-sm font-semibold">{getAvatarLetters()}</span>
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
                      className="focus:outline-none absolute right-0 origin-top-right whitespace-nowrap rounded-md bg-white
                                            p-1 shadow-lg ring-1 ring-cool-gray-100 ring-opacity-5
                                            "
                    >
                      <Menu.Item>
                        {({ active }) => (
                          <Link to="/app" className="text-cool-gray-90 no-underline hover:text-cool-gray-90">
                            <button
                              className={`${active && 'bg-cool-gray-5'} group flex w-full items-center rounded-md
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
                            className={`${active && 'bg-cool-gray-5'} group flex w-full items-center rounded-md
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
                            className={`${active && 'bg-red-10 bg-opacity-50 text-red-60'} group flex w-full
                                            items-center rounded-md px-4 py-2 font-medium`}
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
                      className="flex h-9 cursor-pointer flex-row items-center justify-center rounded-lg px-4
                                    font-medium text-cool-gray-90 no-underline hover:text-cool-gray-90"
                    >
                      Login
                    </div>
                  </Link>

                  <Link to="/new" className="no-underline">
                    <div
                      className="flex h-9 cursor-pointer flex-row items-center justify-center rounded-lg bg-cool-gray-10
                                    px-4 font-medium text-cool-gray-90 no-underline
                                    hover:text-cool-gray-90"
                    >
                      Create account
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* File container */}
          <div className="mb-20 flex h-full flex-col items-center justify-center space-y-10">{body}</div>
        </div>
      </div>
    </>
  );
};

function ImagesIcon() {
  const Icon = iconService.getItemIcon(false, 'png');
  return (
    <div className="relative h-32 w-32">
      <Icon className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
      <Icon className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
    </div>
  );
}

export default SharePhotosView;
