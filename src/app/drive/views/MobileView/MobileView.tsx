import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { getDatabaseProfileAvatar } from '../../services/database.service';
import { userThunks } from '../../../store/slices/user';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import devices from 'assets/images/mobile-app/devices.png';
import Avatar from 'app/shared/components/Avatar';
import appStore from 'assets/images/mobile-app/app-store.jpg';
import googlePlay from 'assets/images/mobile-app/google-play.jpg';

interface MobileProps {
  user: UserSettings | undefined;
}

const Mobile = (props: MobileProps): JSX.Element => {
  const dispatch = useDispatch();
  const { translate } = useTranslationContext();
  const [osMobile, setOsMobile] = useState('');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const fullName = `${props.user?.name} ${props.user?.lastname}`;

  useEffect(() => {
    getDatabaseProfileAvatar().then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null));
  }, [props.user?.avatar]);

  const onLogOutClicked = () => {
    dispatch(userThunks.logoutThunk());
  };

  if (navigator.userAgent.match(/iPhone/i)) {
    setOsMobile('iphone');
  } else if (navigator.userAgent.match(/Android/i)) {
    setOsMobile('android');
  }

  return (
    <div>
      <header className="flex flex-col items-center bg-gray-1 pt-8 pb-4">
        <InternxtLogo className="h-auto w-28" />
        <div className="flex w-full flex-row items-center justify-between px-4 pt-8">
          <div className="flex flex-row">
            <Avatar
              className="mr-2.5 flex-shrink-0"
              diameter={48}
              fullName={fullName}
              src={avatarBlob ? URL.createObjectURL(avatarBlob) : null}
            />
            <div>
              <p className="text-base font-medium text-gray-100">{fullName}</p>
              <p className="text-base text-gray-50">{props.user?.username}</p>
            </div>
          </div>
          <button
            onClick={onLogOutClicked}
            className="cursor-pointer rounded-lg border border-gray-10 bg-white py-2.5 px-5 font-medium drop-shadow"
          >
            Log out
          </button>
        </div>
      </header>
      <section className="mt-36 flex flex-col items-center">
        <img className="w-64" src={devices} alt="Mobile and descktop view" />
        <h2 className="m-6 text-2xl font-medium text-gray-100">{translate('mobileView.title')}</h2>
        <div>
          {osMobile === 'iphone' ? (
            <a href="https://apps.apple.com/es/app/internxt/id1465869889" target="_blank">
              <img className="w-40" src={appStore} alt="app store" />
            </a>
          ) : (
            <a href="https://play.google.com/store/apps/details?id=com.internxt.cloud" target="_blank">
              <img className="w-40" src={googlePlay} alt="google play" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
};

export default Mobile;
