import { Helmet } from 'react-helmet-async';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const PhotosView = (): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex w-full shrink-0 grow flex-col">
      <Helmet>
        <title>{translate('sideNav.photos')} - Internxt Drive</title>
      </Helmet>
      <header className="flex h-14 shrink-0 items-center px-5">
        <h1 className="text-lg">{translate('views.photos.head')}</h1>
      </header>
    </div>
  );
};

export default PhotosView;
