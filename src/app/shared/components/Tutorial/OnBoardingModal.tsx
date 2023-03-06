import MacOsLogo from 'assets/macos_logo.svg';
import WindowsLogo from 'assets/windows_logo.svg';
import LinuxLogo from 'assets/linux_logo.svg';
import DevicesSVG from 'assets/devices.svg';
import XSVG from 'assets/close_x.svg';
import Button from '../Button/Button';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import desktopService from '../../../core/services/desktop.service';
import operatingSystemService from '../../../core/services/operating-system.service';
import { t } from 'i18next';

const separatorV = <div className=" my-2 border-r border-gray-10" />;

const getSOLogo = () => {
  switch (operatingSystemService.getOperatingSystem()) {
    case 'WindowsOS':
      return WindowsLogo;
    case 'MacOS':
      return MacOsLogo;
    case 'LinuxOS':
      return LinuxLogo;
    default:
      return WindowsLogo;
  }
};

export const OnboardingModal = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const logoSrc = getSOLogo();

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
  };

  return (
    <div className="flex h-auto w-auto flex-row rounded-2xl bg-white">
      <div className="absolute top-3 right-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ">
        <img src={XSVG} />
        <div className="absolute inset-0 h-7 w-7 rounded-full bg-black opacity-5"></div>
      </div>
      <div className="flex w-96 flex-col p-10">
        <div>
          <p className="text-3xl text-cool-gray-100">{t('tutorial.signUpTutorial.stepOne.title')}</p>
          <p className="mt-2 text-base text-cool-gray-80">{t('tutorial.signUpTutorial.stepOne.description')}</p>
        </div>
        <div className="mt-6">
          <div className="flex h-24 rounded-xl border border-gray-10 bg-gray-1">
            <div className="flex items-center justify-center p-5 ">
              <img src={logoSrc} />
            </div>
            {separatorV}
            <div className="flex flex-grow items-center justify-center">
              <Button variant="primary" onClick={onDownloadAppButtonClicked} autofocus>
                <span>{translate('views.account.popover.downloadApp')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex">
        <img src={DevicesSVG} />
      </div>
    </div>
  );
};
