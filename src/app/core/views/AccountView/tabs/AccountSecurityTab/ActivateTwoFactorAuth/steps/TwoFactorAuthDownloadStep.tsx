import authyIcon from '../../../../../../../../assets/icons/authy-logo.png';
import appStoreIcon from '../../../../../../../../assets/icons/app-store.svg';
import playStoreIcon from '../../../../../../../../assets/icons/play-store.svg';
import i18n from '../../../../../../../i18n/services/i18n.service';

const TwoFactorAuthDownloadStep = (): JSX.Element => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">

      <div className="flex flex-row items-center">
        {i18n.get('views.account.tabs.security.two-factor-auth.steps.download.description.line1')}
        <div className="flex flex-row items-center font-medium text-neutral-700">
          <div className="relative w-5 h-5 mx-1">
            <img src={authyIcon} height={20} width={20} alt="Authy" />
          </div>
          {i18n.get('views.account.tabs.security.two-factor-auth.steps.download.description.line2')}
        </div>
        {i18n.get('views.account.tabs.security.two-factor-auth.steps.download.description.line3')}
      </div>

      <div className="flex flex-row items-center space-x-4">
        <a href="https://apps.apple.com/us/app/authy/id494168017" target="_blank" rel="noreferrer">
          <img src={appStoreIcon} height={40} width={135} alt="App Store" />
        </a>
        
        <a href="https://play.google.com/store/apps/details?id=com.authy.authy" target="_blank" rel="noreferrer">
          <img src={playStoreIcon} height={40} width={135} alt="Google Play" />
        </a>
      </div>

    </div>
  );
};

export default TwoFactorAuthDownloadStep;
