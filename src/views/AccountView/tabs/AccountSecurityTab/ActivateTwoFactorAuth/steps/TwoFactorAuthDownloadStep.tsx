import googleAuthenticatorIcon from '../../../../../../assets/icons/google-authenticator.svg';
import appStoreIcon from '../../../../../../assets/icons/app-store.svg';
import playStoreIcon from '../../../../../../assets/icons/play-store.svg';
import i18n from '../../../../../../services/i18n.service';

const TwoFactorAuthDownloadStep = (): JSX.Element => {
  return (
    <div className="square flex flex-col items-center justify-center">
      <img src={googleAuthenticatorIcon} className="mr-8" height={48} width={48} alt="Google Authenticator" />
      <div className="text-sm text-neutral-700">
        {i18n.get('views.account.tabs.security.two-factor-auth.steps.download.description')}
      </div>
      <div className="flex items-center mt-4">
        <img src={appStoreIcon} className="mr-2" height={48} width={150} alt="App Store" />
        <img src={playStoreIcon} height={48} width={150} alt="Google Play" />
      </div>
    </div>
  );
};

export default TwoFactorAuthDownloadStep;
