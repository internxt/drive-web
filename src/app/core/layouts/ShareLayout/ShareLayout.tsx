import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ReactComponent as Logo } from 'assets/icons/brand/x-white.svg';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../../core/services/desktop.service';
import bg from 'assets/images/shared-file/bg.png';
import Shield from 'assets/images/shared-file/icons/shield.png';
import EndToEnd from 'assets/images/shared-file/icons/end-to-end.png';
import Lock from 'assets/images/shared-file/icons/lock.png';
import EyeSlash from 'assets/images/shared-file/icons/eye-slash.png';
import '../../../share/views/ShareView/ShareView.scss';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';

interface ShareLayoutProps {
  children: JSX.Element;
}

export default function ShareLayout(props: ShareLayoutProps): JSX.Element {
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useAppSelector((state) => state.user.user);
  const dispatch = useAppDispatch();

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
                <p className="text-3xl font-semibold leading-none">Private and secure cloud storage</p>
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
              <Link to="https://internxt.com" className="no-underline">
                <div
                  className="flex cursor-pointer flex-row items-center justify-center rounded-xl p-1 no-underline
                                ring-3 ring-blue-30"
                >
                  <div
                    className="flex h-12 w-full flex-row items-center justify-center rounded-lg bg-white
                                  px-6 text-xl font-semibold text-blue-70 no-underline"
                  >
                    <span>Try out Internxt</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Download container */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <div className="hidden h-20 flex-shrink-0 flex-row items-center justify-end px-6 sm:flex">
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

          <div className="flex flex-row items-center justify-between p-4 sm:hidden">
            <InternxtLogo className="h-3 w-auto" />
            <Link to="/new" className="no-underline">
              <div
                className="flex h-9 cursor-pointer flex-row items-center justify-end rounded-full border border-primary
                                    px-4 font-medium text-primary no-underline
                                    hover:text-primary-dark"
              >
                Get started
              </div>
            </Link>
          </div>

          {/* File container */}
          <div className="mb-20 flex h-full flex-col items-center justify-center space-y-10">{props.children}</div>
        </div>
      </div>
    </>
  );
}
