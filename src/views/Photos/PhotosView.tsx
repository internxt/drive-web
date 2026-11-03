import { Helmet } from 'react-helmet-async';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import PhotosEmptyState from './components/PhotosEmptyState';
import PhotosGridSkeleton from './components/PhotosGridSkeleton';
import { PhotoDevicesState, usePhotoDevices } from './hooks/usePhotoDevices';

const PhotosContent = ({ state }: { state: PhotoDevicesState }) => {
  if (state.status === 'loading') return <PhotosGridSkeleton />;
  if (state.status === 'loaded' && state.devices.length === 0) return <PhotosEmptyState />;
  return null;
};

const PhotosView = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const { state } = usePhotoDevices();

  return (
    <div className="flex w-full shrink-0 grow flex-col">
      <Helmet>
        <title>{translate('sideNav.photos')} - Internxt Drive</title>
      </Helmet>
      <header className="flex h-14 shrink-0 items-center px-5">
        <h1 className="text-lg">{translate('views.photos.head')}</h1>
      </header>
      <PhotosContent state={state} />
    </div>
  );
};

export default PhotosView;
