import MacOsLogo from 'assets/apple_logo.svg';
import WindowsLogo from 'assets/windows_logo.svg';
import LinuxLogo from 'assets/linux_logo.svg';
import DevicesSVG from 'assets/devices.svg';
import XSVG from 'assets/close_x.svg';
import { Button, Loader } from '@internxt/ui';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import desktopService from '../../../core/services/desktop.service';
import operatingSystemService from '../../../core/services/operating-system.service';
import { t } from 'i18next';
import { FC, useMemo, useState } from 'react';

const separatorV = <div className=" my-2 border-r border-gray-10" />;

const OPERATIVE_SYTEM_LOGOS = {
  WindowsOS: WindowsLogo,
  MacOS: MacOsLogo,
  LinuxOS: LinuxLogo,
};

const OPERATIVE_SYTEM_NAMES = {
  WindowsOS: 'Windows',
  MacOS: 'macOS',
  LinuxOS: 'Linux',
};

type OnBoardingModalProps = {
  onCloseModalPressed: () => void;
};

export const OnboardingModal: FC<OnBoardingModalProps> = ({ onCloseModalPressed }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { translate } = useTranslationContext();

  const operativeSistem = operatingSystemService.getOperatingSystem();
  const logoSrc = useMemo(() => OPERATIVE_SYTEM_LOGOS[operativeSistem], [operativeSistem]);
  const logoName = useMemo(() => OPERATIVE_SYTEM_NAMES[operativeSistem], [operativeSistem]);

  const onImageLoad = (): void => {
    setIsImageLoading(false);
  };

  const DevicesImg = useMemo(
    () => <img src={DevicesSVG} className="aspect-video h-80 w-72" onLoad={onImageLoad} />,
    [DevicesSVG],
  );

  const onDownloadAppButtonClicked = (): void => {
    const getDownloadApp = async () => {
      const download = await desktopService.getDownloadAppUrl();
      return download;
    };
    getDownloadApp()
      .then((download) => {
        window.open(download, '_self');
      })
      .catch(() => {
        notificationsService.show({
          text: t('errors.downloadingDesktopApp'),
          type: ToastType.Error,
        });
      });
    onCloseModalPressed();
  };

  return (
    <>
      {isImageLoading ? (
        <div className="flex w-72 items-center justify-center">
          <Loader classNameLoader="h-6 w-6" />
          <div className="hidden">{DevicesImg}</div>
        </div>
      ) : (
        <div
          className="flex h-auto w-auto min-w-max flex-row rounded-2xl bg-surface dark:bg-gray-5"
          data-test="download-desktop-modal"
        >
          <div
            onClick={onCloseModalPressed}
            className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
            data-test="download-desktop-modal-close-button"
          >
            <img src={XSVG} />
            <div className="absolute inset-0 h-7 w-7 rounded-full bg-black/5 dark:bg-white/10" />
          </div>
          <div className="flex w-96 flex-col p-10">
            <div>
              <p className="text-3xl leading-9 text-gray-100">{t('tutorial.signUpTutorial.stepOne.title')}</p>
              <p className="mt-2 text-base leading-5 text-gray-80	">
                {t('tutorial.signUpTutorial.stepOne.description')}
              </p>
            </div>
            <div className="mt-6">
              <div className="flex h-24 rounded-xl border border-gray-10 bg-gray-1">
                <div className="flex shrink-0 flex-col items-center justify-center p-5">
                  <img src={logoSrc} />
                  <p className="mt-2 text-base leading-5">{logoName}</p>
                </div>
                {separatorV}
                <div className="flex grow items-center justify-center">
                  <Button variant="primary" onClick={onDownloadAppButtonClicked} autofocus>
                    <span>{translate('views.account.popover.downloadApp')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-end">{DevicesImg}</div>
        </div>
      )}
    </>
  );
};
