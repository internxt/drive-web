import { Photo, PhotoId } from '@internxt/sdk/dist/photos';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { photosSlice, PhotosState } from '../store/slices/photos';
import photosThunks from '../store/slices/photos/thunks';
import Empty from './Empty';
import PhotoThumbnail from './PhotoThumbnail';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  useEffect(() => {
    dispatch(photosThunks.fetchThunk());
  }, []);

  return (
    <div className={`${className} h-full w-full overflow-y-auto px-5 pt-2`}>
      <Toolbar onDeleteClick={console.log} onDownloadClick={console.log} onShareClick={console.log} />
      {!photosState.isLoading && photosState.items.length === 0 ? (
        <Empty />
      ) : (
        <Grid selected={photosState.selectedItems} photos={photosState.items} />
      )}
    </div>
  );
}

function Grid({ photos, selected }: { photos: Photo[]; selected: PhotoId[] }) {
  const dispatch = useDispatch();
  return (
    <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
      {photos.map((photo) => {
        const isSelected = selected.some((el) => photo.id === el);

        return (
          <PhotoThumbnail
            onClick={() => console.log('Clicked')}
            onSelect={() => dispatch(photosSlice.actions.toggleSelect(photo.id))}
            selected={isSelected}
            src="https://source.unsplash.com/random"
            key={photo.id}
          />
        );
      })}
    </div>
  );
}
