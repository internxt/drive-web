import { ImageIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import AppStore from 'assets/icons/app-store.svg?react';
import GooglePlay from 'assets/icons/google-play.svg?react';

const APP_STORE_URL = 'https://apps.apple.com/es/app/internxt/id1465869889';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.internxt.cloud';

const PhotosEmptyState = (): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex grow flex-col items-center justify-center gap-6 p-8 pb-20 text-center">
      <ImageIcon className="text-primary" size={64} weight="fill" />
      <div className="space-y-1">
        <p className="text-2xl font-medium text-gray-100">{translate('views.photos.empty.title')}</p>
        <p className="text-lg text-gray-60">{translate('views.photos.empty.description')}</p>
      </div>
      <div className="flex gap-3">
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store">
          <AppStore className="h-10 w-auto" />
        </a>
        <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Play">
          <GooglePlay className="h-10 w-auto" />
        </a>
      </div>
    </div>
  );
};

export default PhotosEmptyState;
