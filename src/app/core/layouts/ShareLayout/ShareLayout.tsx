import { Fragment, useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ReactComponent as Logo } from 'assets/icons/logo.svg';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../../core/services/desktop.service';
import '../../../share/views/ShareView/ShareView.scss';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ReportButton from '../../../share/views/ShareView/ReportButon';
import { ShieldCheck, Password, Key, Eye } from '@phosphor-icons/react';
import { getDatabaseProfileAvatar } from 'app/drive/services/database.service';
import { Avatar, Button } from '@internxt/ui';

interface ShareLayoutProps {
  children: JSX.Element;
}

export default function ShareLayout(props: ShareLayoutProps): JSX.Element {
  const { translate } = useTranslationContext();

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useAppSelector((state) => state.user.user);
  const name = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = name + ' ' + lastName;
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  useEffect(() => {
    getDatabaseProfileAvatar().then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null));
  }, [user]);

  const getDownloadApp = async () => {
    const download = await desktopService.getDownloadAppUrl();
    return download;
  };

  const downloadDesktopApp = () => {
    getDownloadApp()
      .then((download) => {
        window.open(download, '_self');
      })
      .catch(() => {
        notificationsService.show({
          text: 'Something went wrong while downloading the desktop app',
          type: ToastType.Error,
        });
      });
  };

  const logout = () => {
    dispatch(userThunks.logoutThunk());
  };

  return (
    <>
      {/* Content */}
      <div className="flex h-screen flex-row items-stretch justify-center bg-surface text-gray-90 dark:bg-gray-1">
        {/* Banner */}
        <div
          className="relative hidden h-full w-96 shrink-0 flex-col overflow-hidden text-white lg:flex"
          style={{ background: 'radial-gradient(65% 65% at 50% 50%, #0058DB 0%, rgb(24,24,27) 100%)' }}
        >
          <div className="z-10 flex h-full flex-col space-y-12 p-12">
            <div className="relative flex flex-row items-center space-x-2 font-semibold">
              <Logo className="w-36 text-white" />
            </div>
            <div className="flex h-full flex-col justify-center space-y-20">
              <div className="flex flex-col space-y-2">
                <p className="text-3xl font-semibold leading-none">{translate('shareLayout.subtitle')}</p>
              </div>

              <div className="flex flex-col space-y-3 text-xl">
                {[
                  { id: 1, icon: Password, label: translate('shareLayout.labels.military-grade') },
                  { id: 2, icon: Key, label: translate('shareLayout.labels.zero-knowledge') },
                  { id: 3, icon: ShieldCheck, label: translate('shareLayout.labels.privacy') },
                  { id: 4, icon: Eye, label: translate('shareLayout.labels.open-source') },
                ].map((item) => (
                  <div className="flex flex-row items-center space-x-3" key={item.id}>
                    <item.icon className="h-6 w-6" />
                    <span className="text-lg font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {!isAuthenticated && (
              <a
                href="https://internxt.com"
                className="cursor-pointer no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary">{translate('shareLayout.tryInternxt')}</Button>
              </a>
            )}
          </div>
        </div>

        {/* Download container */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <div className="hidden h-20 shrink-0 flex-row items-center justify-end px-6 sm:flex">
            {isAuthenticated ? (
              <>
                {/* User avatar */}
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button className="inline-flex w-full justify-center rounded-lg px-4 py-2 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/10">
                    <div className="flex flex-row space-x-2.5">
                      <Avatar
                        diameter={36}
                        fullName={fullName}
                        src={avatarBlob ? URL.createObjectURL(avatarBlob) : null}
                      />
                      <span className="flex flex-row items-center font-medium">{fullName}</span>
                    </div>
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 origin-top-right whitespace-nowrap rounded-md bg-surface p-1 shadow-lg ring-1 ring-gray-100/5 focus:outline-none dark:bg-gray-5">
                      <Menu.Item>
                        {({ active }) => (
                          <Link to="/" className="text-gray-90 no-underline hover:text-gray-90">
                            <button
                              className={`${
                                active && 'bg-gray-1 dark:bg-gray-10'
                              } group flex w-full items-center rounded-md px-4 py-2 font-medium`}
                            >
                              {translate('shareLayout.topBar.drive')}
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
                            className={`${
                              active && 'bg-gray-1 dark:bg-gray-10'
                            } group flex w-full items-center rounded-md px-4 py-2 font-medium`}
                          >
                            {translate('shareLayout.topBar.downloadApp')}
                          </button>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              logout();
                            }}
                            className={`${
                              active && 'bg-gray-1 dark:bg-gray-10'
                            } group flex w-full items-center rounded-md px-4 py-2 font-medium`}
                          >
                            {translate('shareLayout.topBar.logout')}
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
                <div className="flex flex-row space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      window.location.href = process.env.REACT_APP_HOSTNAME + '/login';
                    }}
                  >
                    {translate('shareLayout.topBar.login')}
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => {
                      window.location.href = process.env.REACT_APP_HOSTNAME + '/new';
                    }}
                  >
                    {translate('shareLayout.topBar.createAccount')}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-row items-center justify-between p-4 sm:hidden">
            <InternxtLogo className="h-3 w-auto text-gray-100" />
            <Link to="/new" className="no-underline">
              <div className="flex h-9 cursor-pointer flex-row items-center justify-end rounded-full border border-primary px-4 font-medium text-primary no-underline hover:text-primary-dark">
                {translate('shareLayout.topBar.getStarted')}
              </div>
            </Link>
          </div>

          {/* File container */}
          <div className="mb-20 flex h-full flex-col items-center justify-center space-y-10">{props.children}</div>

          {/* Bottom bar */}
          <div className="hidden h-20 shrink-0 flex-row items-center justify-end px-6 sm:flex">
            <div className="ml-auto px-4">
              <ReportButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
