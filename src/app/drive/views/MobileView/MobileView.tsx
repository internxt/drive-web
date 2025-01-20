import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { getDatabaseProfileAvatar } from '../../services/database.service';
import { userThunks } from '../../../store/slices/user';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import devices from 'assets/images/mobile-app/devices.png';
import appStore from 'assets/images/mobile-app/app-store.jpg';
import googlePlay from 'assets/images/mobile-app/google-play.jpg';
import { Button, Avatar } from '@internxt/ui';

interface MobileProps {
  user: UserSettings | undefined;
}

const Mobile = (props: MobileProps): JSX.Element => {
  const dispatch = useDispatch();
  const { translate } = useTranslationContext();
  const [osMobile, setOsMobile] = useState('');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const name = props.user?.name ?? '';
  const lastName = props.user?.lastname ?? '';
  const fullName = name + ' ' + lastName;

  useEffect(() => {
    getDatabaseProfileAvatar().then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null));
  }, [props.user?.avatar]);

  useEffect(() => {
    if (navigator.userAgent.match(/iPhone/i)) {
      setOsMobile('iphone');
    } else if (navigator.userAgent.match(/Android/i)) {
      setOsMobile('android');
    }
  });

  const onLogOutClicked = () => {
    dispatch(userThunks.logoutThunk());
  };

  return (
    <div>
      <header className="flex flex-col items-center bg-gray-1 pb-4 pt-8">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
        <div className="flex w-full flex-row items-center justify-between px-4 pt-8">
          <div className="... mr-2 flex flex-row truncate">
            <Avatar
              className="mr-2.5 shrink-0"
              diameter={48}
              fullName={fullName}
              src={avatarBlob ? URL.createObjectURL(avatarBlob) : null}
            />
            <div className="... flex flex-col truncate">
              <p className="... truncate text-base font-medium text-gray-100">{fullName}</p>
              <p className="... truncate text-base text-gray-50">{props.user?.username}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={onLogOutClicked}>
            {translate('mobileView.logOut')}
          </Button>
        </div>
      </header>
      <section className="mb-4 mt-10 flex flex-col items-center">
        <img className="w-64" src={devices} alt="Mobile and descktop view" />
        <h2 className="m-6 text-center text-2xl font-medium text-gray-100">{translate('mobileView.title')}</h2>
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
