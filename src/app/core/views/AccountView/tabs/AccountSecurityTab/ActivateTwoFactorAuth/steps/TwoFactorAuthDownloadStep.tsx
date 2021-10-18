import authyIcon from '../../../../../../../../assets/icons/authy-logo.png';
import googleAuthenticatorIcon from '../../../../../../../../assets/icons/google-authenticator.svg';
import appStoreIcon from '../../../../../../../../assets/icons/app-store.svg';
import playStoreIcon from '../../../../../../../../assets/icons/play-store.svg';
import i18n from '../../../../../../../i18n/services/i18n.service';

const TwoFactorAuthDownloadStep = (): JSX.Element => {
  return (
    <div className="p-8 square flex flex-col items-center justify-center">
      <div className="square p-3 flex flex-col items-center justify-center bg-l-neutral-20 rounded-lg mb-6">
        <img src={authyIcon} height={48} width={48} alt="Authy" className="mb-2" />
        <img src={googleAuthenticatorIcon} height={48} width={48} alt="Google Authenticator" />
      </div>
      <div className="text-sm text-neutral-700 mb-6">
        {i18n.get('views.account.tabs.security.two-factor-auth.steps.download.description')}
      </div>
      <div className="flex items-center">
        <img src={appStoreIcon} className="mr-2" height={48} width={150} alt="App Store" />
        <img src={playStoreIcon} height={48} width={150} alt="Google Play" />
      </div>
    </div>
  );
};

export default TwoFactorAuthDownloadStep;
