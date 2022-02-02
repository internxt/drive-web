/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Fragment } from 'react';
import { Menu, Dialog, Transition } from '@headlessui/react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';
import { aes } from '@internxt/lib';

import { getShareInfo } from 'app/share/services/share.service';
import { ReactComponent as Logo } from 'assets/icons/brand/x-white.svg';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import { Network } from 'app/drive/services/network';
import i18n from 'app/i18n/services/i18n.service';
import { Link } from 'react-router-dom';

import bg from 'assets/images/shared-file/bg.png';
import Shield from 'assets/images/shared-file/icons/shield.png';
import EndToEnd from 'assets/images/shared-file/icons/end-to-end.png';
import Lock from 'assets/images/shared-file/icons/lock.png';
import EyeSlash from 'assets/images/shared-file/icons/eye-slash.png';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-arrow-right';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import UilMultiply from '@iconscout/react-unicons/icons/uil-multiply';
import UilMinus from '@iconscout/react-unicons/icons/uil-minus';
import UilPlus from '@iconscout/react-unicons/icons/uil-plus';

import './ShareView.scss';
import downloadService from 'app/drive/services/download.service';
import errorService from 'app/core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';

export interface ShareViewProps {
  match: match<{ token: string }>;
}

interface GetShareInfoWithDecryptedName extends ShareTypes.GetShareInfoResponse {
  decryptedName: string | null;
}

interface ShareViewState {
  token: string;
  progress: number;
  info: GetShareInfoWithDecryptedName | null;
  error: Error | null;
  accessedFile: boolean;
  openPreview: boolean;
}

class ShareView extends Component<ShareViewProps, ShareViewState> {
  state = {
    token: this.props.match.params.token,
    progress: TaskProgress.Min,
    info: null,
    error: null,
    accessedFile: false,
    user: null,
    openPreview: false,
  };

  loadInfo = async () => {
    // ! iOS Chrome is not supported
    if (navigator.userAgent.match('CriOS')) {
      this.setState({
        ...this.state,
        error: new Error('Chrome iOS not supported. Use Safari to proceed'),
      });
    }

    
    this.setState({
      accessedFile: true
    });

    const token = this.state.token;

    try {
      const info = await getShareInfo(token).catch(() => {
        throw new Error(i18n.get('error.linkExpired'));
      });

      this.setState({
        info: {
          ...info,
          decryptedName: this.getDecryptedName(info),
        },
      });
    } catch (err) {
      const castedError = errorService.castError(err);

      this.setState({
        error: castedError,
      });
    }
  };
  
  openPreview = async () => {
    this.setState({
        openPreview: true,
      });
  };

  closePreview = async () => {
    this.setState({
        openPreview: false,
      });
  };

  download = async (): Promise<void> => {
    const info = this.state.info as unknown as GetShareInfoWithDecryptedName | null;
    const MIN_PROGRESS = 0;

    if (info) {
      const network = new Network('NONE', 'NONE', 'NONE');

      this.setState({ progress: MIN_PROGRESS });
      const [fileBlobPromise] = network.downloadFile(info.bucket, info.file, {
        fileEncryptionKey: Buffer.from(info.encryptionKey, 'hex'),
        fileToken: info.fileToken,
        progressCallback: (progress) => {
          this.setState({ ...this.state, progress: Math.max(MIN_PROGRESS, progress * 100) });
        },
      });
      const fileBlob = await fileBlobPromise;

      downloadService.downloadFileFromBlob(fileBlob, info.decryptedName as string);
    }
  };

  getDecryptedName(info: ShareTypes.GetShareInfoResponse): string {
    const salt = `${process.env.REACT_APP_CRYPTO_SECRET2}-${info.fileMeta.folderId.toString()}`;
    const decryptedFilename = aes.decrypt(info.fileMeta.name, salt);
    const type = info.fileMeta.type;

    return `${decryptedFilename}${type ? `.${type}` : ''}`;
  }

  componentDidMount() {
    this.loadInfo();
  }

  render(): JSX.Element {
    const error = this.state.error as unknown as Error;
    const isAuthenticated = true;
    let body;

    const Spinner = (
      <>
        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824
                3 7.938l3-2.647z">
          </path>
        </svg>
      </>
    );

    if (error) {
      console.log(error.message);
      const ItemIconComponent = iconService.getItemIcon(false, 'default');

      body = (
        <>
          <div className="relative w-32 h-32">
            <ItemIconComponent className="absolute -top-2.5 left-7 transform rotate-10" />
            <ItemIconComponent className="absolute top-0.5 -left-7 transform rotate-10-" />
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold">Shared files no longer available</span>
            <span className="text-cool-gray-60">Link expired or files deleted</span>
          </div>

          {isAuthenticated && (
            <Link to="/app" className="no-underline cursor-pointer text-cool-gray-90 hover:text-cool-gray-90">
              <div className="flex flex-row items-center justify-center rounded-lg bg-cool-gray-10 h-10 px-6
                            font-medium space-x-2">
                <span>Open Internxt Drive</span>
                <UilArrowRight height="20" width="20" />
              </div>
            </Link>
          )}
        </>
      );
    } else if (this.state.info) {
      const info = this.state.info as unknown as GetShareInfoWithDecryptedName;
      const formattedSize = sizeService.bytesToString(info.fileMeta.size);
      const ItemIconComponent = iconService.getItemIcon(false, info.fileMeta.type);
      const { progress } = this.state;

      body = (
        <>
          {/* File info */}
          <div className="flex flex-col space-y-4 items-center justify-center">

            <div className="h-32 w-32">
              <ItemIconComponent />
            </div>

            <div className="flex flex-col justify-center items-center space-y-2">
              <div className="flex flex-col justify-center items-center font-medium">
                <span className="text-xl">{info.decryptedName}</span>
                <span className="text-cool-gray-60">{formattedSize}</span>
              </div>
              
              <div className="text-cool-gray-60">
                <span>Shared by:</span>
                {' '}
                <span className="font-medium text-cool-gray-70">{info.user}</span>
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex flex-row space-x-3 items-center justify-center">
            <button
              onClick={this.openPreview}
              className="flex flex-row items-center h-10 px-6 rounded-lg bg-blue-10 text-blue-60 space-x-2
                         font-medium cursor-pointer active:bg-blue-20 active:bg-opacity-65"
            >
              <UilEye height="20" width="20" />
              <span>{i18n.get('actions.view')}</span>
            </button>

            <button
              onClick={this.download}
              className={`flex flex-row items-center h-10 px-6 rounded-lg text-white space-x-2 cursor-pointer
                          font-medium ${progress && !(progress < 100) ? 'bg-green-40' : 'bg-blue-60'}`}
            >
              {progress ?
                progress < 100 ?
                  (
                    <>
                      <div className="h-5 w-5 text-white">{Spinner}</div>
                      <span>{i18n.get('actions.downloading')}</span>
                      <span className="font-normal text-blue-20">15%</span>
                      {/* <span className="font-normal text-blue-20">{`${progress}%`}</span> */}
                    </>
                  )
                  :
                  (
                    <>
                      <UilCheck height="24" width="24" />
                      <span className="font-medium">{i18n.get('actions.downloaded')}</span>
                    </>
                  )
                :
                (
                  <>
                    <UilImport height="20" width="20" />
                    <span className="font-medium">{i18n.get('actions.download')}</span>
                  </>
                )
              }
            </button>
          </div>
        </>
      );
    } else {
      body = (
        <div className="h-8 w-8 text-cool-gray-30">{Spinner}</div>
      );
    }

    return (
      <>
        {/* Preview */}
        <Transition
          appear
          show={this.state.openPreview}
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog
            as="div"
            className="fixed inset-0 z-10 overflow-y-auto overflow-x-hidden text-white"
            onClose={this.closePreview}
          >
            <div className="min-h-screen w-screen flex flex-col items-center justify-start">

              {/* Close overlay */}
              <Dialog.Overlay className="fixed inset-0 bg-cool-gray-100 bg-opacity-90 backdrop-filter
                                        backdrop-blur-md" />

              {/* Content */}
              <div
                tabIndex={0}
                className="flex flex-col items-center justify-start min-h-screen"
              >
                <div
                  className="relative z-10 my-24 outline-none"
                >
                  <div className="relative px-80 w-96 min-h-screen bg-white" />
                  <div className="w-full h-6" />
                  <div className="relative px-80 w-96 min-h-screen bg-black" />
                  <div className="w-full h-6" />
                  <div className="relative px-80 w-96 min-h-screen bg-blue-60" />
                </div>
              </div>

              {/* Background */}
              <div className="fixed -top-6 -inset-x-20 h-16 bg-cool-gray-100 z-10 pointer-events-none
                              filter blur-2xl" />

              {/* Top bar controls */}
              <div className="fixed top-0 left-0 w-screen h-0 flex flex-row items-start justify-between px-4 z-20
                              select-none text-lg font-medium">
                
                {/* Close and title */}
                <div className="flex flex-row items-center justify-start h-10 mt-3 space-x-4 z-10">
                  <button
                    onClick={this.closePreview}
                    className="relative group flex flex-col items-center justify-center h-10 w-10 bg-white bg-opacity-0
                                    hover:bg-opacity-10 focus:bg-opacity-5 transition duration-50 ease-in-out
                                    rounded-full">
                    <UilMultiply height="20" width="20" />
                  </button>

                  <Dialog.Title>{this.state.info && this.state.info['decryptedName']}</Dialog.Title>
                </div>

                {/* Download button */}
                <div className="flex flex-row items-center justify-end h-10 mt-3 space-x-4 z-10">
                  <button
                    onClick={this.closePreview}
                    className="flex flex-row items-center h-10 px-6 rounded-lg space-x-2 cursor-pointer
                              font-medium bg-white bg-opacity-0 hover:bg-opacity-10 focus:bg-opacity-5
                              transition duration-50 ease-in-out">
                    <UilImport height="20" width="20" />
                    <span className="font-medium">{i18n.get('actions.download')}</span>
                  </button>
                </div>
              </div>
              
              {/* Preview bottom controls */}
              <div className="fixed bottom-6 left-1/2 flex flex-row items-center h-12 px-1.5 text-lg
                              font-medium z-10 transform -translate-x-1/2 rounded-xl overflow-hidden
                              shadow-xl select-none">
                <div className="absolute inset-0 h-full w-full backdrop-filter backdrop-blur-xl
                                backdrop-contrast-50" />
                <div className="absolute inset-0 h-full w-full bg-cool-gray-100 bg-opacity-80" />

                <div className="flex flex-row items-center justify-center space-x-1.5 z-10">
                  <span className="font-medium px-4 z-10">1 of 3</span>

                  <div className="w-px h-8 bg-white bg-opacity-10" />
                
                  <div className="flex flex-row items-center justify-center">
                    <button
                      onClick={() => { console.log('zoom +'); }}
                      disabled={false}
                      className="flex flex-row items-center justify-center h-9 w-9 rounded-lg cursor-pointer
                                 bg-white bg-opacity-0 hover:bg-opacity-10 active:bg-opacity-5 disabled:opacity-30
                                 transition duration-50 ease-in-out disabled:pointer-events-none">
                      <UilPlus height="24" width="24" className="pointer-events-none" />
                    </button>

                    <button
                      onClick={() => { console.log('zoom -'); }}
                      disabled={true}
                      className="flex flex-row items-center justify-center h-9 w-9 rounded-lg cursor-pointer
                                 bg-white bg-opacity-0 hover:bg-opacity-10 active:bg-opacity-5 disabled:opacity-30
                                 transition duration-50 ease-in-out disabled:pointer-events-none">
                      <UilMinus height="24" width="24" className="pointer-events-none" />
                    </button>
                  </div>
                </div>
              </div>
              
            </div>
          </Dialog>
        </Transition>

        {/* Content */}
        <div className="flex flex-row justify-center items-stretch h-screen bg-white text-cool-gray-90">
          
          {/* Banner */}
          <div className="relative flex flex-col w-96 h-full bg-blue-80 text-white">
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
                  {
                    [
                      {icon: Shield, label: 'Privacy by design'},
                      {icon: EndToEnd, label: 'End-to-end encryption'},
                      {icon: Lock, label: 'Military-grade encryption'},
                      {icon: EyeSlash, label: 'Zero-knowledge technology'},
                    ].map((item) => (
                      <div className="flex flex-row items-center space-x-3">
                        <img src={item.icon} className="w-6 h-6" />
                        <span>{item.label}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {!isAuthenticated && (
                <Link to="/new" className="no-underline">
                  <div className="flex flex-row items-center justify-center rounded-xl no-underline ring-3 ring-blue-30
                                  p-1 cursor-pointer">
                    <div className="flex flex-row items-center justify-center w-full h-12 bg-white text-blue-70
                                    rounded-lg no-underline text-xl font-semibold px-6">
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
            <div className="flex flex-row justify-end items-center h-20 px-6">
              
              {isAuthenticated ?
                (
                  <>
                    {/* User avatar */}
                    <Menu as="div" className="relative inline-block text-left">
                      <div>
                        <Menu.Button className="inline-flex justify-center w-full px-4 py-2 font-medium
                                                rounded-lg focus:outline-none focus-visible:ring-2
                                                focus-visible:ring-blue-20 focus-visible:ring-opacity-75">
                          <div className="flex flex-row space-x-3">
                            <div className="flex flex-row items-center justify-center rounded-full bg-blue-10
                                          text-blue-80 h-8 w-8">
                              <span className="font-semibold text-sm">JD</span>
                            </div>
                            <div className="flex flex-row items-center font-semibold">
                              <span>Jonh{' '}Doe</span>
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
                        <Menu.Items className="absolute right-0 origin-top-right bg-white rounded-md shadow-lg ring-1
                                              ring-cool-gray-100 ring-opacity-5 focus:outline-none p-1 whitespace-nowrap
                                              ">
                          
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
                        <div className="flex flex-row items-center justify-center rounded-lg h-9 px-4 font-medium
                                      text-cool-gray-90 hover:text-cool-gray-90 cursor-pointer no-underline">
                          Login
                        </div>
                      </Link>

                      <Link to="/new" className="no-underline">
                        <a className="flex flex-row items-center justify-center rounded-lg bg-cool-gray-10 h-9 px-4
                                      font-medium text-cool-gray-90 hover:text-cool-gray-90 cursor-pointer
                                      no-underline">
                          Create account
                        </a>
                      </Link>
                    </div>
                  </>
                )
              }
              
            </div>

            {/* File container */}
            <div className="flex flex-col items-center justify-center space-y-10 h-full">
              {body}
            </div>

          </div>

        </div>
      </>
      
    );
  }
}

export default ShareView;
