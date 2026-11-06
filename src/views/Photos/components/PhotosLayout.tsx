import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface PhotosLayoutProps {
  filters?: ReactNode;
  children?: ReactNode;
}

const PhotosLayout = ({ filters, children }: PhotosLayoutProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex min-h-0 w-full shrink-0 grow flex-col">
      <Helmet>
        <title>{translate('sideNav.photos')} - Internxt Drive</title>
      </Helmet>
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-5">
        <h1 className="text-lg">{translate('views.photos.head')}</h1>
        {filters && <div className="flex min-w-0 items-center gap-2">{filters}</div>}
      </header>
      {children}
    </div>
  );
};

export default PhotosLayout;
